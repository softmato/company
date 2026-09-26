'use server';

import { redirect } from 'next/navigation';

import { endPortalSession } from '@/lib/portal/session';

export async function signOut(): Promise<void> {
  await endPortalSession();
  redirect('/login');
}
