'use client';

import { useSyncExternalStore } from 'react';

/**
 * The contact message as a draft in localStorage, so a refresh or a closed tab
 * does not lose a spoken or typed brief.
 *
 * A store read through `useSyncExternalStore` rather than `useState` plus a
 * restoring effect: localStorage is external state, the server snapshot is
 * empty, and React swaps in the draft after hydration without a mismatch.
 *
 * Storage can be unavailable (private mode, blocked site data), so the value
 * lives in memory and localStorage is only ever a best-effort copy of it.
 */
const KEY = 'softmato:contact-draft';

let draft: string | null = null;
const listeners = new Set<() => void>();

function read(): string {
  if (draft === null) {
    try {
      draft = localStorage.getItem(KEY) ?? '';
    } catch {
      draft = '';
    }
  }
  return draft;
}

export function writeDraft(text: string) {
  draft = text;
  try {
    if (text) localStorage.setItem(KEY, text);
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function useDraft(): string {
  return useSyncExternalStore(subscribe, read, () => '');
}
