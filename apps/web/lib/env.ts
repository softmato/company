/**
 * Boot-time environment validation (docs/ENVIRONMENT.md §2).
 *
 * "A missing ENCRYPTION_KEY must fail at startup, not at the first login."
 *
 * Server-only. Importing this from a client component is a build error by
 * design — `server-only` makes the mistake impossible rather than merely
 * discouraged.
 */
import 'server-only';
import { z } from 'zod';

const hex32 = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'must be 32 bytes of hex (64 characters)');

/**
 * Optional, and tolerant of being present but blank.
 *
 * `KEY=` in a `.env` file is an empty string, not an absent variable — and a
 * blank line is exactly how every optional value in `.env.example` ships. On a
 * plain `z.string().optional()` that is harmless, because every reader treats
 * `''` as falsy anyway. On one carrying a format check it is not: `.email()`
 * and `.url()` both reject `''`, so leaving an optional variable blank failed
 * the boot with "Invalid email" — the opposite of what optional means, and a
 * failure whose message points at the wrong problem.
 *
 * Only wraps the format-checked ones. A *required* URL that is blank must
 * still fail, which is why this is applied per field rather than globally.
 */
function blankAsUnset<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  );
}

/**
 * A provider's sandbox/live switch, tolerant of being present but blank.
 *
 * `blankAsUnset` cannot be used here: it returns an optional, which discards
 * the default, and a provider environment that can be `undefined` is one every
 * reader has to re-default for itself. Sandbox is the safe end, so blank,
 * absent and unrecognised all have to land there — but only blank and absent
 * do it silently. A typo still fails the boot, because `ESEWA_ENV=liv` quietly
 * meaning sandbox is how a live deployment ends up pointed at rc-epay.
 */
function providerEnv() {
  return z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.enum(['sandbox', 'live']).default('sandbox'),
  );
}

const serverSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_ENV: z.enum(['local', 'preview', 'production']).default('local'),

  DATABASE_URL: z.string().url(),

  AUTH_SECRET: z.string().min(32, 'generate with: openssl rand -base64 32'),
  AUTH_URL: blankAsUnset(z.string().url()),
  CRON_SECRET: z.string().min(16),
  /** AES-256-GCM key for TOTP secrets at rest. */
  ENCRYPTION_KEY: hex32,

  /**
   * Which adapters the composition root registers (`lib/payments/providers.ts`).
   *
   * `mock` is new, and it exists so that faking a payment has to be *asked
   * for*. Every adapter used to fake one implicitly — a missing secret key
   * produced a successful result for the exact expected amount, which settled
   * to the ledger. A deployment that wants that behaviour now says so here.
   */
  PAYMENT_MODE: z.enum(['mock', 'sandbox', 'live']).default('sandbox'),

  /*
   * Provider credentials. Optional individually, because a provider with no
   * credentials is simply not offered; the composition root decides that, and
   * refuses to boot when it leaves nobody able to take a payment.
   *
   * `*_ENV` is separate from `PAYMENT_MODE` on purpose: `PAYMENT_MODE` says
   * which adapters exist, `*_ENV` says which of a provider's two hosts an
   * adapter talks to.
   */
  ESEWA_MERCHANT_CODE: z.string().optional(),
  ESEWA_SECRET_KEY: z.string().optional(),
  ESEWA_BASE_URL: blankAsUnset(z.string().url()),
  ESEWA_ENV: providerEnv(),

  KHALTI_SECRET_KEY: z.string().optional(),
  KHALTI_BASE_URL: blankAsUnset(z.string().url()),
  KHALTI_ENV: providerEnv(),

  COMPANY_NAME: z.string().default('Softmato Technology Pvt Ltd'),

  /*
   * Email. Optional: the contact form always writes to the database, and only
   * additionally emails when these are set. A missing key must not lose an
   * enquiry, so it degrades rather than throwing (docs/PRD.md §5.1).
   */
  RESEND_API_KEY: z.string().optional(),
  /**
   * The sending domain — a bare hostname, not an address. Every mailbox is
   * derived from it per category (docs/EMAIL_SYSTEM.md §2), so `billing@` and
   * `alert@` cost no configuration and no DNS change.
   *
   * This is the one piece of the sender that stays in the environment rather
   * than in the settings table: it must match what Resend verified for this
   * deployment, and a typo in a form would silently stop all email. Unset
   * means the shipped `softmato.com`.
   */
  EMAIL_DOMAIN: z.string().optional(),
  /**
   * Overrides the derived reply address. Leave unset: `info@EMAIL_DOMAIN` is
   * derived, and it cannot point at a domain we do not own.
   */
  EMAIL_REPLY_TO: blankAsUnset(z.string().email()),
  /** Where contact enquiries are sent. */
  COMPANY_EMAIL: blankAsUnset(z.string().email()),

  /*
   * Cloudflare R2. Optional as a group: with none of it set, the CMS image
   * fields stay plain URL inputs and uploading is simply unavailable. All or
   * nothing is checked below — a half-configured bucket fails at upload time,
   * which is exactly the late failure this file exists to prevent.
   */
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_BUCKET: z.string().optional(),
  /** Public base URL the bucket is served from, e.g. https://cdn.softmato.com */
  R2_PUBLIC_BASE_URL: blankAsUnset(z.string().url()),
  /**
   * S3 endpoint. Cloudflare prints it on the bucket page, so it is accepted
   * here rather than silently ignored; when unset it is derived from the
   * account id, which is the same string.
   */
  R2_ENDPOINT: blankAsUnset(z.string().url()),
  /**
   * Payment proofs, invoice PDFs, client documents — Phase 3 onwards. Read by
   * nothing yet, and deliberately outside the all-or-nothing group below: the
   * public bucket must be usable before the private one exists.
   */
  R2_PRIVATE_BUCKET: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_CHECKOUT_URL: z.string().url(),
});

/**
 * Collects failures rather than throwing, so one misconfigured deployment
 * reports every missing variable in a single build. Throwing per schema meant
 * the server block failed first and hid the `NEXT_PUBLIC_*` block entirely, so
 * a fresh environment needed two failed builds to learn what it needs.
 *
 * The `{}` returned on failure is a sentinel: the caller throws before `env`
 * is ever read.
 */
function collect<T extends z.ZodTypeAny>(
  schema: T,
  source: unknown,
  issues: string[],
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    // The variable NAMES are safe to print. The values never are.
    issues.push(
      ...result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`),
    );
    return {} as z.infer<T>;
  }

  return result.data;
}

const issues: string[] = [];

const parsed = {
  ...collect(serverSchema, process.env, issues),
  /*
   * Read through explicit member expressions rather than spreading
   * `process.env`: that literal form is the one a bundler can statically
   * inline, so the schema keeps describing the shape a client build sees.
   */
  ...collect(
    publicSchema,
    {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_CHECKOUT_URL: process.env.NEXT_PUBLIC_CHECKOUT_URL,
    },
    issues,
  ),
};

if (issues.length > 0) {
  throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

export const env = parsed;

/**
 * A preview deployment must never hold live provider credentials
 * (docs/ENVIRONMENT.md §4).
 */
if (env.APP_ENV === 'preview' && env.PAYMENT_MODE === 'live') {
  throw new Error(
    'PAYMENT_MODE=live is not permitted on a preview deployment. ' +
      'Every preview runs against provider sandboxes.',
  );
}

/**
 * eSewa is all-or-nothing, for the same reason R2 is below.
 *
 * A merchant code without a secret key is not a degraded eSewa; it is an
 * adapter that throws the moment somebody tries to pay. Catching it here turns
 * a failed checkout into a failed deploy.
 */
const ESEWA_KEYS = ['ESEWA_MERCHANT_CODE', 'ESEWA_SECRET_KEY'] as const;

const esewaSet = ESEWA_KEYS.filter((key) => env[key]);

if (esewaSet.length > 0 && esewaSet.length < ESEWA_KEYS.length) {
  const missing = ESEWA_KEYS.filter((key) => !env[key]);
  throw new Error(
    `eSewa is partially configured. Missing: ${missing.join(', ')}. ` +
      'Set both or neither — a half-configured provider fails at checkout.',
  );
}

/**
 * A provider pointed at its live host while the deployment is not live.
 *
 * The reverse of the preview check above, and the more dangerous direction:
 * `PAYMENT_MODE=sandbox` with `ESEWA_ENV=live` reads as safe in a review and
 * takes real money from real people.
 */
for (const key of ['ESEWA_ENV', 'KHALTI_ENV'] as const) {
  if (env[key] === 'live' && env.PAYMENT_MODE !== 'live') {
    throw new Error(
      `${key}=live requires PAYMENT_MODE=live. A provider must not be pointed ` +
        `at its live host while PAYMENT_MODE is ${env.PAYMENT_MODE}.`,
    );
  }
}

/**
 * R2 is all-or-nothing.
 *
 * A partially configured bucket would pass boot and then fail on the first
 * upload — the late failure this module exists to prevent.
 */
const R2_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BUCKET',
  'R2_PUBLIC_BASE_URL',
] as const;

const r2Set = R2_KEYS.filter((key) => env[key]);

if (r2Set.length > 0 && r2Set.length < R2_KEYS.length) {
  const missing = R2_KEYS.filter((key) => !env[key]);
  throw new Error(
    `R2 is partially configured. Missing: ${missing.join(', ')}. ` +
      'Set all of them or none — a half-configured bucket fails at upload.',
  );
}

/** True when uploads are available. */
export const r2Configured = r2Set.length === R2_KEYS.length;

/**
 * The private bucket is configured on its own, and deliberately so.
 *
 * It shares the account and the credentials with the public bucket but not the
 * `R2_PUBLIC_BASE_URL` — a private bucket has no public base URL, and
 * requiring one before invoice PDFs could be stored would be requiring the
 * wrong thing for the wrong reason. A deployment may also have one bucket and
 * not the other: the CMS shipped before documents did.
 *
 * Same all-or-nothing rule, though. Naming a private bucket with no
 * credentials behind it is a configuration that boots and then fails on the
 * first invoice.
 */
const PRIVATE_R2_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PRIVATE_BUCKET',
] as const;

const privateR2Set = PRIVATE_R2_KEYS.filter((key) => env[key]);

if (env.R2_PRIVATE_BUCKET && privateR2Set.length < PRIVATE_R2_KEYS.length) {
  const missing = PRIVATE_R2_KEYS.filter((key) => !env[key]);
  throw new Error(
    `R2_PRIVATE_BUCKET is set but the bucket is unreachable. Missing: ` +
      `${missing.join(', ')}.`,
  );
}

/**
 * True when a document PDF can be stored and read back.
 *
 * False is a supported state, not a broken one: documents are then rendered on
 * every request exactly as they were before this existed.
 */
export const privateStorageConfigured =
  privateR2Set.length === PRIVATE_R2_KEYS.length;
