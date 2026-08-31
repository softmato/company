/**
 * Re-shows or rotates an admin's TOTP enrolment.
 *
 *   pnpm admin:totp -- --email you@example.com            # show the current one
 *   pnpm admin:totp -- --email you@example.com --rotate   # mint a new secret
 *
 * `create-admin.mts` prints the enrolment URI once and never stores it in
 * plaintext, which leaves no way back in if the authenticator entry is lost.
 * The secret itself is recoverable — it is encrypted with ENCRYPTION_KEY, not
 * hashed — so showing it again is possible for anyone who already holds that
 * key and the database. That is the same trust level as rotating it, and a
 * founder locked out of the only admin account has no other route: there is no
 * self-serve reset, and `admin_users` cannot hold an active admin without TOTP
 * (docs/DATABASE.md §2.4).
 *
 * This prints a live MFA secret to the terminal. Do not run it over a shared
 * screen, and clear the scrollback afterwards.
 */
import { eq } from 'drizzle-orm';

import { adminUsers, closeDb, db } from '@softmato/db';
import { decryptSecret } from '../apps/web/lib/crypto.core';
import { createTotpEnrolment, enrolmentUri } from '../apps/web/lib/totp.core';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = arg('email')?.toLowerCase();
const rotate = process.argv.includes('--rotate');

if (!email) {
  throw new Error(
    'Usage: pnpm admin:totp -- --email <email> [--rotate]',
  );
}

const [user] = await db
  .select({
    id: adminUsers.id,
    email: adminUsers.email,
    totpSecret: adminUsers.totpSecret,
    totpEnabled: adminUsers.totpEnabled,
    isActive: adminUsers.isActive,
  })
  .from(adminUsers)
  .where(eq(adminUsers.email, email))
  .limit(1);

if (!user) {
  throw new Error(`No admin with email ${email}.`);
}

let secretBase32: string;
let uri: string;

if (rotate) {
  const enrolment = createTotpEnrolment(user.email);

  await db
    .update(adminUsers)
    .set({ totpSecret: enrolment.encryptedSecret, totpEnabled: true })
    .where(eq(adminUsers.id, user.id));

  secretBase32 = decryptSecret(enrolment.encryptedSecret);
  uri = enrolment.otpauthUri;

  console.log(
    '\n⚠  Secret rotated. Every existing authenticator entry for this ' +
      'account is now dead —\n   delete it before adding the one below.\n',
  );
} else {
  if (!user.totpSecret) {
    throw new Error(
      `${email} has no TOTP secret stored. Re-run with --rotate to enrol one.`,
    );
  }

  // Throws on a rotated or wrong ENCRYPTION_KEY, which is the honest answer:
  // the stored secret is unreadable and only --rotate can recover the account.
  secretBase32 = decryptSecret(user.totpSecret);
  uri = enrolmentUri(secretBase32, user.email);
}

console.log(`Admin: ${user.email} (id ${user.id})`);
console.log(`Active: ${user.isActive}   TOTP enabled: ${user.totpEnabled}\n`);
console.log('Setup key — type this into your authenticator app manually:\n');
console.log(`  ${secretBase32}\n`);
console.log('Or scan this URI as a QR code:\n');
console.log(`  ${uri}\n`);
console.log(
  'Settings must be: time-based, SHA1, 6 digits, 30 seconds — the defaults\n' +
    'in Google Authenticator, Authy, 1Password and Bitwarden.\n',
);

await closeDb();
