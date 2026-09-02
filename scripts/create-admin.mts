/**
 * Creates an admin and prints their enrolment link. Run per person:
 *
 *   pnpm admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is read from ADMIN_PASSWORD in the environment, never from an
 * argument — arguments land in shell history and process listings.
 *
 * The row is created **inactive with no TOTP secret**, which is the one shape
 * `admin_users` allows an un-enrolled admin to take: the constraint is
 * `NOT is_active OR totp_enabled` (docs/DATABASE.md §2.4), so inactive is
 * exactly the gap enrolment lives in. Opening the printed link, scanning the
 * QR and confirming a code is what sets the secret and activates the account.
 *
 * Until then the account cannot sign in — `authorize()` rejects `!isActive`
 * before it looks at anything else.
 */
import { eq } from 'drizzle-orm';

import { adminUsers, closeDb, db } from '@softmato/db';
import { enrolmentUrl } from '../apps/web/lib/enrolment/link';
import { mintEnrolmentToken } from '../apps/web/lib/enrolment/token';
import { hashPassword, passwordMinLength } from '../apps/web/lib/password.core';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = arg('email')?.toLowerCase();
const name = arg('name');
const password = process.env.ADMIN_PASSWORD;

if (!email || !name) {
  throw new Error('Usage: pnpm admin:create -- --email <email> --name <name>');
}

// Shared with `/admin/security` so the two cannot disagree on the rule.
const MIN_LENGTH = passwordMinLength();

if (!password || password.length < MIN_LENGTH) {
  throw new Error(
    `Set ADMIN_PASSWORD in the environment (${MIN_LENGTH} characters minimum). ` +
      'Do not pass it as a command-line argument.',
  );
}

if (password.length < 12) {
  console.warn(
    '\n⚠  Weak password accepted because APP_ENV=local.\n' +
      '   This account must not exist in preview or production.\n',
  );
}

const [existing] = await db
  .select({ id: adminUsers.id })
  .from(adminUsers)
  .where(eq(adminUsers.email, email))
  .limit(1);

if (existing) {
  throw new Error(`An admin with email ${email} already exists.`);
}

const passwordHash = await hashPassword(password);

const [created] = await db
  .insert(adminUsers)
  .values({
    email,
    name,
    passwordHash,
    totpSecret: null,
    totpEnabled: false,
    isActive: false,
    role: 'founder',
  })
  .returning({ id: adminUsers.id });

const subject = {
  id: created!.id,
  email,
  isActive: false,
  totpEnabled: false,
};

const { token, expiresAt } = mintEnrolmentToken(subject);

console.log(`\nAdmin created: ${email} (id ${created!.id})`);
console.log('Status: inactive — cannot sign in until enrolment completes.\n');
console.log('Send them this link. It expires', expiresAt.toISOString(), '\n');
console.log(`  ${enrolmentUrl(token)}\n`);
console.log(
  'The link stops working the moment it is used. If it expires first,\n' +
    're-issue one with:  pnpm admin:enrol -- --email ' +
    email +
    '\n',
);

await closeDb();
