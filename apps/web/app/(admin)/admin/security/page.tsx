/**
 * Move your authenticator to a new phone.
 *
 * This is the answer to "I got a new phone" and "I think my secret leaked".
 * The credential sections are self-service and scoped to the signed-in admin:
 * there is no screen here for resetting *someone else*, because with two
 * founders the account that would perform the reset is as likely to be the
 * locked-out one. That path is the CLI (`pnpm admin:totp --rotate`), which
 * needs the database and ENCRYPTION_KEY rather than a session.
 *
 * Adding an admin is the one exception, and it is a different act: it creates
 * a credential rather than recovering one, so it cannot lock anybody out and
 * does not need the out-of-band footing that recovery does.
 */
import { auth } from '@/lib/auth';
import { AdminRoster } from '@/components/admin/admin-roster';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ChangePasswordForm } from '@/components/admin/change-password-form';
import { InviteAdminForm } from '@/components/admin/invite-admin-form';
import { RotateTotpForm } from '@/components/admin/rotate-totp-form';
import { TotpSetup } from '@/components/admin/totp-setup';
import { listAdmins } from '@/lib/admin/roster';
import { qrSvg } from '@/lib/enrolment/qr';
import { findTotpSecret } from '@/lib/enrolment/queries';
import { rotationSecret } from '@/lib/enrolment/secret';
import { passwordMinLength } from '@/lib/password.core';
import { enrolmentUri } from '@/lib/totp';

/*
 * Never cached: the QR below is one admin's candidate secret, and a cached
 * copy would be served to whoever loaded the page next.
 */
export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const id = Number(session?.user?.id);

  /*
   * Empty is unreachable for a signed-in admin — `authorize()` refuses a login
   * without a secret, and the database refuses an active admin without one. It
   * derives a harmless candidate rather than branching the page, and
   * `rotateTotp` re-reads the column and refuses outright if it is ever null.
   */
  const currentSecret = (await findTotpSecret(id)) ?? '';

  /*
   * Derived from the secret it would replace, so this page is idempotent: a
   * reload, or the re-render that follows a failed attempt, shows the same QR
   * rather than silently replacing the one just scanned. It becomes a
   * different secret the moment a rotation commits. See `enrolment/secret.ts`.
   */
  const candidate = rotationSecret(id, currentSecret);
  const svg = await qrSvg(enrolmentUri(candidate, email));
  const admins = await listAdmins();

  return (
    <div className="max-w-2xl">
      <Breadcrumbs trail={[]}>Security</Breadcrumbs>

      <h1 className="headline mt-2 text-2xl">Security</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        The two credentials that sign you in as {email}. Both are required at
        every sign-in, so changing either one still leaves the other in place.
      </p>

      <section className="mt-9">
        <h2 className="eyebrow">Password</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no reset link — a password is stored hashed and cannot be
          recovered, only replaced. Choose something you will keep.
        </p>

        <ChangePasswordForm minimum={passwordMinLength()} />
      </section>

      <section className="mt-12 border-t border-border pt-9">
        <h2 className="eyebrow">Authenticator</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Replace the app that generates your sign-in codes. Your current one
          keeps working until you finish — nothing changes if you close this
          page.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          You&rsquo;ll need your password, a code from your{' '}
          <strong className="font-medium text-foreground">current</strong>{' '}
          authenticator, and a code from the new QR below.
        </p>

        <RotateTotpForm>
          <TotpSetup svg={svg} setupKey={candidate} />
        </RotateTotpForm>
      </section>

      <section className="mt-12 border-t border-border pt-9">
        <h2 className="eyebrow">Admins</h2>

        <AdminRoster admins={admins} currentId={id} />

        <p className="mt-7 text-sm text-muted-foreground">
          Adding someone creates their account inactive and gives you a link to
          hand over. They set up their own authenticator on their own phone —
          the same enrolment page the first founder used, reached from here
          instead of from a terminal.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          You never see their authenticator secret, deliberately. If you did,
          you could sign in as them, and the audit log would stop being able to
          tell the two of you apart.
        </p>

        <InviteAdminForm minimum={passwordMinLength()} />
      </section>
    </div>
  );
}
