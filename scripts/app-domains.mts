/**
 * Reads and edits one credential's registered domains and webhook URL.
 *
 * **Break-glass. The admin panel is the normal path** — `/admin/applications`
 * does all of this behind a password and an authenticator code, and shows the
 * audit trail beside it. Reach for this only when the panel is unreachable.
 *
 *     pnpm app:domains -- --client-id app_test_hostelhub_2d90d3bq
 *     pnpm app:domains -- --client-id … --add hostelhub.localhost --note 'local dev'
 *     pnpm app:domains -- --client-id … --remove hostelhub.localhost
 *     pnpm app:domains -- --client-id … --webhook-url https://…/webhooks/softmato
 *     pnpm app:domains -- --client-id … --webhook-url none
 *
 * The allowlist is the answer to *"and where may they send my customer"*, which
 * a client secret does not answer — see `payment-core/applications/domains.ts`.
 * Nothing here is taken from a request; that is the whole point, and it is why
 * an integrator cannot add their own host and this script exists at all.
 *
 * ## Registering a host that is still on localhost
 *
 * A `*.localhost` name is accepted only when all three of `applications/
 * loopback.ts`'s conditions hold, and the first one is this process's own
 * environment:
 *
 *     APP_ENV=local pnpm app:domains -- --client-id … --add hostelhub.localhost
 *
 * Without `APP_ENV=local` the add is refused, deliberately — on a deployment,
 * a loopback `webhook_url` points at *us*, not at the integrator.
 *
 * Bare `localhost` can never be stored: `application_domains.hostname` requires
 * two dot-separated labels. Use a subdomain.
 */
import { applicationCredentials, applications, closeDb, db } from '@softmato/db';
import { eq } from 'drizzle-orm';

import {
  addDomain,
  listDomains,
  removeDomain,
  setCredentialWebhookUrl,
  type Actor,
  type AuditRecorder,
} from '../packages/payment-core/index.ts';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const clientId = flag('--client-id');

if (!clientId) {
  console.error('Usage: pnpm app:domains -- --client-id <client_id>');
  console.error('List them with: pnpm webhook:status');
  process.exit(1);
}

const [credential] = await db
  .select({
    id: applicationCredentials.id,
    clientId: applicationCredentials.clientId,
    mode: applicationCredentials.mode,
    revokedAt: applicationCredentials.revokedAt,
    webhookUrl: applicationCredentials.webhookUrl,
    name: applications.name,
  })
  .from(applicationCredentials)
  .innerJoin(
    applications,
    eq(applications.id, applicationCredentials.applicationId),
  )
  .where(eq(applicationCredentials.clientId, clientId))
  .limit(1);

if (!credential) {
  console.error(`No credential with client_id ${clientId}.`);
  process.exit(1);
}

if (credential.revokedAt) {
  console.error(
    `${clientId} was revoked on ${credential.revokedAt.toISOString()}.\n` +
      'A revoked credential is replaced, never edited.',
  );
  process.exit(1);
}

/** Printed rather than written: no admin user did this. */
const audit: AuditRecorder = async (entry) => {
  console.log(`  audit: ${entry.action}`);
};

const actor: Actor = { type: 'system', id: 'scripts/app-domains.mts' };

const add = flag('--add');
const remove = flag('--remove');
const webhookUrl = flag('--webhook-url');

if (add) {
  const created = await addDomain(
    { credentialId: credential.id, hostname: add, note: flag('--note') ?? null },
    actor,
    audit,
  );
  console.log(`  added        ${created.hostname}`);
}

if (remove) {
  const existing = await listDomains(credential.id);
  const match = existing.find((row) => row.hostname === remove);

  if (!match) {
    console.error(`  "${remove}" is not registered for this credential.`);
    process.exit(1);
  }

  await removeDomain(match.id, actor, audit);
  console.log(`  removed      ${match.hostname}`);
}

/*
 * Set after any --add in the same run, so registering a host and pointing the
 * webhook at it is one command. `setCredentialWebhookUrl` re-checks the
 * allowlist itself, and would refuse the reverse order.
 */
if (webhookUrl) {
  const value = webhookUrl === 'none' ? null : webhookUrl;
  await setCredentialWebhookUrl(credential.id, value, actor, audit);
  console.log(`  webhook_url  ${value ?? '(cleared)'}`);
}

const domains = await listDomains(credential.id);

const [after] = await db
  .select({ webhookUrl: applicationCredentials.webhookUrl })
  .from(applicationCredentials)
  .where(eq(applicationCredentials.id, credential.id))
  .limit(1);

console.log('');
console.log(`  application  ${credential.name}`);
console.log(`  client_id    ${credential.clientId}`);
console.log(
  `  mode         ${credential.mode === 'live' ? 'PRODUCTION' : 'Sandbox'}`,
);
console.log(`  webhook_url  ${after?.webhookUrl ?? '(none)'}`);
console.log('');
console.log('  REGISTERED DOMAINS');

if (domains.length === 0) {
  console.log(
    '    (none) — every return_url and webhook_url on this credential is refused',
  );
} else {
  for (const row of domains) {
    console.log(`    ${row.hostname}${row.note ? `  — ${row.note}` : ''}`);
  }
}

await closeDb();
