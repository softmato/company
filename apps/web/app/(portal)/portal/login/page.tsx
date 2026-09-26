import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthFrame } from '@/components/portal/auth-frame';
import { SignInForm } from '@/components/portal/sign-in-form';
import { currentViewer } from '@/lib/portal/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function PortalLoginPage() {
  if (await currentViewer()) redirect('/');

  return (
    <AuthFrame
      title="Sign in"
      lead="Follow your project, share files with the team and see your invoices."
      footer={
        <>
          New here? Your Softmato contact sends you an invitation link.
          <br />
          Forgotten your password? Ask them for a fresh link — it lets you set a
          new one.
        </>
      }
    >
      <SignInForm />
    </AuthFrame>
  );
}
