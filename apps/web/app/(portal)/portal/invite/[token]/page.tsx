/**
 * Where an invitation link lands. Setting a password here spends the link and
 * signs the person in. A link that has expired, been used, or been replaced by
 * a newer one gets the same answer — nothing about the account is revealed.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthFrame } from '@/components/portal/auth-frame';
import { InviteForm } from '@/components/portal/invite-form';
import { passwordMinLength } from '@/lib/password.core';
import { findInvitee } from '@/lib/portal/invite';

export const metadata: Metadata = {
  title: 'Set your password',
  // The token is in the URL; keep it out of any Referer header.
  referrer: 'no-referrer',
};

export default async function PortalInvitePage({
  params,
}: PageProps<'/portal/invite/[token]'>) {
  const { token } = await params;
  const invitee = await findInvitee(token);

  if (!invitee) {
    return (
      <AuthFrame
        title="This link no longer works"
        lead="It may have expired, been used already, or been replaced by a newer one. Ask your Softmato contact to send a fresh link."
      >
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:underline"
        >
          Go to sign in
        </Link>
      </AuthFrame>
    );
  }

  const firstName = invitee.name.split(/\s+/)[0];

  return (
    <AuthFrame
      title={
        invitee.hasPassword ? 'Choose a new password' : `Welcome, ${firstName}`
      }
      lead={
        invitee.hasPassword ? (
          <>
            This replaces your current password and signs out any other devices.
          </>
        ) : (
          <>
            You have been invited to the {invitee.clientName} client portal.
            Choose a password for{' '}
            <span className="font-medium text-foreground">{invitee.email}</span>
            .
          </>
        )
      }
    >
      <InviteForm
        token={token}
        email={invitee.email}
        minLength={passwordMinLength()}
      />
    </AuthFrame>
  );
}
