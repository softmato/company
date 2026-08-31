/**
 * Move your authenticator to a new phone.
 *
 * This is the answer to "I got a new phone" and "I think my secret leaked".
 * It is deliberately self-service and scoped to the signed-in admin: there is
 * no screen here for resetting *someone else*, because with two founders the
 * account that would perform the reset is as likely to be the locked-out one.
 * That path is the CLI (`pnpm admin:totp --rotate`), which needs the database
 * and ENCRYPTION_KEY rather than a session.
 */
import { auth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ChangePasswordForm } from '@/components/admin/change-password-form';
import { RotateTotpForm } from '@/components/admin/rotate-totp-form';
import { TotpSetup } from '@/components/admin/totp-setup';
import { decryptSecret } from '@/lib/crypto';
import { qrSvg } from '@/lib/enrolment/qr';
import { sealPendingSecret } from '@/lib/enrolment/pending';
import { passwordMinLength } from '@/lib/password.core';
import { createTotpEnrolment } from '@/lib/totp';

/*
 * A fresh candidate secret per render, and never cached — a cached QR would be
 * a secret served to whoever loaded the page next.
 */
export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const id = Number(session?.user?.id);

  const enrolment = createTotpEnrolment(email);
  const svg = await qrSvg(enrolment.otpauthUri);

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

        <RotateTotpForm
          pending={sealPendingSecret(id, enrolment.encryptedSecret)}
        >
          <TotpSetup
            svg={svg}
            setupKey={decryptSecret(enrolment.encryptedSecret)}
          />
        </RotateTotpForm>
      </section>
    </div>
  );
}
