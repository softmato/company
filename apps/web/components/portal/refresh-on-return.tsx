'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Tab-flicking within this window re-reads nothing. */
const MIN_GAP_MS = 30_000;

/**
 * Re-reads the page when the client comes back to the tab — from the deploy
 * email, say — so stages and the preview are current. Nothing runs while the
 * page sits open, so an idle tab costs no server work.
 */
export function RefreshOnReturn() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last < MIN_GAP_MS) return;
      last = Date.now();
      router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);

  return null;
}
