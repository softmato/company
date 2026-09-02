/**
 * Creates a real invoice and a real checkout session, and prints the URL.
 *
 * This exists because there was no way to reach the checkout page by hand.
 * Everything that creates a session in production comes in over HTTP with an
 * application's credentials, so proving the money path end to end in sandbox
 * meant either writing a client or inserting rows directly — and inserting
 * rows directly proves nothing, because the interesting logic is precisely
 * what the insert would skip.
 *
 * So this goes through `createInvoice` and `createSession`, the same two
 * functions `POST /v1/invoices` and `POST /v1/checkout` call. In particular
 * `createSession` is what computes `allowed_providers` from the amount and the
 * active provider rows, which is the field the checkout page renders. A script
 * that wrote its own session row would hide the one thing most likely to be
 * wrong.
 *
 * Usage, from the repo root:
 *
 *   pnpm demo:checkout
 *   pnpm demo:checkout -- --amount 250 --name "Ram Bahadur"
 *
 * `--amount` is in rupees, because that is how a person says it. It is
 * converted to paisa here and never touched as a float again.
 *
 * Safe to run repeatedly: every invoice gets a fresh `external_ref`, so no run
 * collides with another's idempotency record.
 */
import { db, platformSettings } from '../packages/db/index.ts';
/*
 * The app's own settings resolution and seller mapping, both pure. A script
 * that assembled the company's details by hand would put a second spelling of
 * the seller onto real invoices in the real table.
 */
import { sellerFromSettings } from '../apps/web/lib/documents/seller.ts';
import { resolve } from '../apps/web/lib/settings/registry.ts';
import {
  createInvoice,
  createSession,
  type AuthenticatedApplication,
  type AuditRecorder,
} from '../packages/payment-core/index.ts';

/** The seeded sandbox application. Not live, so nothing here can touch real money. */
const CLIENT_ID = 'app_test_hostelhub_2d90d3bq';

interface Options {
  amountMinor: bigint;
  customerName: string;
  email: string;
}

function parseArgs(argv: string[]): Options {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };

  const rupees = get('--amount') ?? '100';

  if (!/^\d+(\.\d{1,2})?$/.test(rupees)) {
    throw new Error(
      `--amount must be rupees with at most two decimals, got ${rupees}`,
    );
  }

  // Parsed as text, not as a float. `parseFloat('1000.05') * 100` is
  // 100004.99999999999, and this is a money path.
  const [whole, fraction = ''] = rupees.split('.');
  const paisa = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));

  if (paisa <= 0n) throw new Error('--amount must be greater than zero');

  return {
    amountMinor: paisa,
    customerName: get('--name') ?? 'Sandbox Customer',
    email: get('--email') ?? 'sandbox@softmato.com',
  };
}

/**
 * The application row, read rather than assumed.
 *
 * `authenticateApplication` needs a client secret we do not have here, so this
 * loads the row directly — the one shortcut in the script, and it is a read of
 * data the real path would have read too. It refuses a live application: this
 * script must never be the thing that raises a real invoice.
 */
async function loadApplication(): Promise<AuthenticatedApplication> {
  const rows = await db.query.applications.findMany();
  const app = rows.find((row) => row.clientId === CLIENT_ID);

  if (!app) {
    throw new Error(
      `No application with client_id ${CLIENT_ID}. Seed the database first.`,
    );
  }

  if (app.isLive) {
    throw new Error(
      `${CLIENT_ID} is a live application. This script only runs against sandbox.`,
    );
  }

  return {
    id: app.id,
    clientId: app.clientId,
    productId: app.productId,
    name: app.name,
    isLive: app.isLive,
    scopes: app.scopes as AuthenticatedApplication['scopes'],
    webhookUrl: app.webhookUrl,
    usedPreviousSecret: false,
  };
}

/**
 * Softmato's details as the admin panel has them, for the invoice's snapshot.
 *
 * Reads the table directly and resolves it through the same registry
 * `getSettings()` uses — that one is `server-only` and cannot be imported into
 * a script, but the resolution and the mapping either side of it are pure.
 */
async function loadSeller() {
  const rows = await db
    .select({ key: platformSettings.key, value: platformSettings.value })
    .from(platformSettings);

  return sellerFromSettings(resolve(new Map(rows.map((r) => [r.key, r.value]))));
}

/** Audit entries are printed rather than written; this is a developer tool. */
const audit: AuditRecorder = async (entry) => {
  console.log(`  audit: ${entry.action}`);
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const application = await loadApplication();
  const checkoutBase =
    process.env.NEXT_PUBLIC_CHECKOUT_URL?.replace(/\/+$/, '') ??
    'http://payment.localhost:3000';

  const seller = await loadSeller();

  const result = await db.transaction(async (tx) => {
    const { invoice } = await createInvoice(
      tx,
      application,
      {
        seller,
        externalRef: `demo-${Date.now()}`,
        customer: {
          externalRef: `demo-customer-${Date.now()}`,
          name: options.customerName,
          email: options.email,
        },
        lines: [
          {
            description: 'Sandbox payment test',
            quantity: 1,
            unitPriceMinor: options.amountMinor,
          },
        ],
        /*
         * The `presentation` block a real integrator sends, so the checkout
         * page and the invoice can be looked at with plan details on them
         * rather than only in the sample fixtures. Same shape and same rules
         * as `POST /v1/invoices` accepts — see docs/API.md §3.
         */
        metadata: {
          presentation: {
            version: 1,
            plan_name: 'HostelHub Growth — Annual',
            tagline: 'For properties running more than one building.',
            features: [
              'Up to 500 beds across unlimited properties',
              'Nightly off-site backups, restorable to any point in 30 days',
              'Guest check-in and check-out from a phone',
              'Staff accounts with per-role permissions',
            ],
            highlights: ['Priority support', 'Free onboarding'],
            billing_period: '12 months',
          },
        },
      },
      audit,
    );

    const session = await createSession(
      tx,
      application,
      { invoiceId: invoice.invoiceNo },
      checkoutBase,
      audit,
    );

    return { invoice, session };
  });

  const { invoice, session } = result;

  console.log('');
  console.log('  invoice      ', invoice.invoiceNo);
  console.log('  amount       ', `NPR ${Number(options.amountMinor) / 100}`);
  console.log('  session      ', session.session.id);
  console.log('  providers    ', session.session.allowedProviders.join(', ') || '(none)');
  console.log('  expires      ', session.session.expiresAt.toISOString());
  console.log('');
  console.log('  open:', session.checkoutUrl);
  console.log('');

  if (session.session.allowedProviders.length === 0) {
    console.warn(
      '  WARNING: no providers. Check payment_providers.is_active and the\n' +
        '  amount limits — the checkout page will render nothing to click.',
    );
  }
}

await main();
process.exit(0);
