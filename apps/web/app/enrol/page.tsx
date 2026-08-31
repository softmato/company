/**
 * One-time enrolment: scan the QR, confirm a code, the account goes active.
 *
 * This page is reachable without a session by design — a new admin has no TOTP
 * secret and therefore cannot sign in. The enrolment token in the URL is the
 * only thing that authorises it, and it authorises nothing else.
 *
 * **It never takes an email address.** Asking "who are you?" and returning that
 * person's QR would hand a working second factor to anyone who knows a
 * founder's address. The subject comes from the signed token or nowhere.
 */
import type { Metadata } from 'next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TotpSetup } from '@/components/admin/totp-setup';
import { Wordmark } from '@/components/public/wordmark';
import { decryptSecret } from '@/lib/crypto';
import { qrSvg } from '@/lib/enrolment/qr';
import { sealPendingSecret } from '@/lib/enrolment/pending';
import { findEnrolmentSubject } from '@/lib/enrolment/queries';
import { claimedAdminId, verifyEnrolmentToken } from '@/lib/enrolment/token';
import { createTotpEnrolment } from '@/lib/totp';

import { confirmEnrolment } from './actions';

export const metadata: Metadata = {
  title: 'Set up your authenticator',
  robots: { index: false, follow: false },
};

function Refused() {
  return (
    <main className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-6 py-20">
      <Wordmark />

      <Card className="mt-5 px-6 py-6">
        <h1 className="headline text-[22px]">This link doesn&rsquo;t work</h1>
        {/*
          One message for expired, already-used, tampered and unknown. Naming
          which one would confirm whether an account exists, and none of the
          four has a different remedy.
        */}
        <p className="mt-2 text-sm text-muted-foreground">
          Enrolment links last 24 hours and stop working once they&rsquo;ve been
          used. Ask an admin to send you a new one.
        </p>
      </Card>
    </main>
  );
}

export default async function EnrolPage({
  searchParams,
}: PageProps<'/enrol'>) {
  const { token: rawToken, error } = await searchParams;
  const token = typeof rawToken === 'string' ? rawToken : '';

  const id = claimedAdminId(token);
  if (id === null) return <Refused />;

  const subject = await findEnrolmentSubject(id);
  if (!subject || !verifyEnrolmentToken(token, subject)) return <Refused />;

  /*
   * A fresh secret every render, and nothing is written to the row until the
   * code confirms it. Reloading this page therefore abandons the previous QR
   * rather than leaving a half-enrolled admin behind.
   */
  const enrolment = createTotpEnrolment(subject.email);
  const svg = await qrSvg(enrolment.otpauthUri);

  return (
    <main className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-6 py-20">
      <Wordmark />

      <Card className="mt-5 px-6 py-6">
        <h1 className="headline text-[22px]">Set up your authenticator</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Signing in to {subject.email} needs a code from your phone. Scan this
          once with Google Authenticator, Authy, 1Password or Bitwarden.
        </p>

        {error === '1' ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            That code didn&rsquo;t match. The QR below is a new one — scan it
            again, then enter the six digits it shows.
          </p>
        ) : null}

        <form action={confirmEnrolment} className="mt-1 grid gap-4">
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="pending"
            value={sealPendingSecret(subject.id, enrolment.encryptedSecret)}
          />

          <TotpSetup
            svg={svg}
            setupKey={decryptSecret(enrolment.encryptedSecret)}
          />

          <Button type="submit" className="mt-1 w-full">
            Confirm and activate
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        Keep the account in your authenticator app. You&rsquo;ll need a code
        every time you sign in.
      </p>
    </main>
  );
}
