/**
 * Re-issues an enrolment link for an admin who has not finished enrolling, or
 * who needs to start over.
 *
 *   pnpm admin:enrol -- --email you@example.com          # re-issue
 *   pnpm admin:enrol -- --email you@example.com --reset  # deactivate, then issue
 *
 * Enrolment links expire after 24 hours and die on use, so an invite that sat
 * in an inbox over a weekend needs replacing. That is the plain case.
 *
 * `--reset` is the locked-out case: it clears the TOTP secret and deactivates
 * the account, which is what makes a *new* link valid for someone who already
 * enrolled. It is destructive — the admin cannot sign in from the moment it
 * runs until they finish the new enrolment — so it prints what it is about to
 * do and requires the account to be named exactly.
 *
 * The alternative for a lost phone, which does not deactivate anything, is
 * `pnpm admin:totp -- --email <email>` to re-display the existing secret.
 */
import { eq } from 'drizzle-orm';

import { adminUsers, closeDb, db } from '@softmato/db';
import { enrolmentUrl } from '../apps/web/lib/enrolment/link';
import { mintEnrolmentToken } from '../apps/web/lib/enrolment/token';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = arg('email')?.toLowerCase();
const reset = process.argv.includes('--reset');

if (!email) {
  throw new Error('Usage: pnpm admin:enrol -- --email <email> [--reset]');
}

const [user] = await db
  .select({
    id: adminUsers.id,
    email: adminUsers.email,
    isActive: adminUsers.isActive,
    totpEnabled: adminUsers.totpEnabled,
  })
  .from(adminUsers)
  .where(eq(adminUsers.email, email))
  .limit(1);

if (!user) {
  throw new Error(`No admin with email ${email}.`);
}

if (user.isActive && !reset) {
  throw new Error(
    `${email} is already enrolled and active.\n` +
      '  To move them to a new phone without locking them out, they can use\n' +
      '  /admin/security while signed in, or run:\n' +
      `    pnpm admin:totp -- --email ${email}\n` +
      '  To force a fresh enrolment anyway, re-run this with --reset.',
  );
}

let subject = user;

if (reset && (user.isActive || user.totpEnabled)) {
  /*
   * Both columns move together. `is_active = false` with `totp_enabled = true`
   * would satisfy the constraint but leave a stale secret behind, and the
   * enrolment token is signed over both — a token minted against (false, true)
   * would not match the (false, false) a re-created admin has.
   */
  await db
    .update(adminUsers)
    .set({ totpSecret: null, totpEnabled: false, isActive: false })
    .where(eq(adminUsers.id, user.id));

  subject = { ...user, isActive: false, totpEnabled: false };

  console.log(
    `\n⚠  ${email} is now deactivated and cannot sign in.\n` +
      '   They regain access only by completing the link below.\n',
  );
}

const { token, expiresAt } = mintEnrolmentToken(subject);

console.log(
  `Enrolment link for ${email} — expires ${expiresAt.toISOString()}\n`,
);
console.log(`  ${enrolmentUrl(token)}\n`);

await closeDb();
