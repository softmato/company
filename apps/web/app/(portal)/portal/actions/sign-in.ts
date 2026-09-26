'use server';

import { redirect } from 'next/navigation';

import { startPortalSession } from '@/lib/portal/session';
import { verifyClientSignIn } from '@/lib/portal/sign-in';

export interface SignInState {
  error?: string;
  email?: string;
}

const MESSAGES = {
  credentials:
    'That email and password do not match an account. Check both and try again.',
  throttled:
    'Too many attempts for this email. Wait fifteen minutes and try again.',
} as const;

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').slice(0, 320);
  const password = String(formData.get('password') ?? '').slice(0, 512);

  if (!email || !password) {
    return { error: 'Enter your email and password.', email };
  }

  const outcome = await verifyClientSignIn(email, password);

  if (!outcome.ok) return { error: MESSAGES[outcome.reason], email };

  await startPortalSession(outcome.userId);
  redirect('/');
}
