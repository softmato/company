/**
 * Rotates an application's client secret and prints the new one.
 *
 * **Break-glass. The admin panel is the normal path** — `/admin/applications`
 * registers, rotates, revokes and manages domains, with re-authentication
 * before a live credential is minted and an audit row for each act. Reach for
 * this only when the panel is unreachable.
 *
 *     pnpm app:secret -- --client-id app_test_hostelhub_2d90d3bq
 *     pnpm app:secret -- --client-id app_test_hostelhub_2d90d3bq --scopes
 *
 * **This is the only way to obtain a usable secret**, and the reason is the
 * design working correctly: secrets are argon2id-hashed at issue and are never
 * recoverable. If nobody wrote the value down when the application was
 * registered, rotation is not a workaround — it is the intended path.
 *
 * Rotation is safe to run: `rotateSecret` keeps the superseded secret alive
 * for 24 hours, so an integrator already deployed against the old one has a
 * window to redeploy rather than a wall of 401s.
 *
 * **It is not the webhook secret.** `application_credentials.webhook_secret` is stored in
 * plaintext because HMAC needs the value back, and `pnpm webhook:status --
 * --reveal` prints it. This is the client secret, for the `Authorization:
 * Bearer` header on `/v1`. They are different credentials and neither works in
 * the other's place.
 *
 * The secret is printed once, here, and then only its last four digits are
 * knowable. Put it straight into the consuming application's secret store.
 */
import {
  applicationCredentials,
  applications,
  closeDb,
  db,
} from '@softmato/db';
import {
  rotateSecret,
  type AuditRecorder,
} from '../packages/payment-core/index.ts';
import { eq } from 'drizzle-orm';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const clientId = flag('--client-id');

if (!clientId) {
  console.error('Usage: pnpm app:secret -- --client-id <client_id>');
  console.error('List them with: pnpm webhook:status');
  process.exit(1);
}

/*
 * The client id names a **credential**, not an application. An application
 * holds up to two, and rotating is something you do to one of them — the other
 * keeps working, which is the whole point of the split.
 */
const [credential] = await db
  .select({
    id: applicationCredentials.id,
    clientId: applicationCredentials.clientId,
    mode: applicationCredentials.mode,
    revokedAt: applicationCredentials.revokedAt,
    name: applications.name,
    scopes: applications.scopes,
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
      'A revoked credential cannot rotate. Mint a new one in the admin panel.',
  );
  process.exit(1);
}

/*
 * A Production secret is not something to reissue from a shell on a
 * developer's laptop without meaning to. Sandbox rotates freely; Production
 * has to be asked for explicitly, so that a mistyped client id cannot take
 * down a live integration.
 *
 * The admin panel now applies the same rule with a password and a TOTP code.
 * This flag is the break-glass equivalent, not a weaker path.
 */
if (credential.mode === 'live' && !argv.includes('--yes-live')) {
  console.error(
    `${clientId} is a PRODUCTION credential. Rotating its secret will break\n` +
      'the integrator 24 hours from now unless they redeploy. Re-run with\n' +
      '--yes-live if that is genuinely what you want.',
  );
  process.exit(1);
}

/** Printed rather than written: no admin user did this. */
const audit: AuditRecorder = async (entry) => {
  console.log(`  audit: ${entry.action}`);
};

const result = await rotateSecret(
  credential.id,
  { type: 'system', id: 'scripts/app-secret.mts' },
  audit,
);

console.log('');
console.log(`  application  ${credential.name}`);
console.log(`  client_id    ${credential.clientId}`);
console.log(
  `  mode         ${credential.mode === 'live' ? 'PRODUCTION' : 'Sandbox'}`,
);
console.log(`  client_secret ${result.secret}`);
console.log('');
console.log(
  `  The previous secret keeps working until ${result.previousSecretExpiresAt.toISOString()}.`,
);
console.log('  This value is shown once. It cannot be printed again.');

if (argv.includes('--scopes')) {
  console.log(`\n  scopes       ${(credential.scopes as string[]).join(', ')}`);
}

await closeDb();
