'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { cn } from '@/lib/cn';

/**
 * Toasts.
 *
 * A toast **names what happened** — "Payment approved. Journal entry posted."
 * — rather than saying "Done" (docs/handoff/UI_HANDOFF.md §8). On the money
 * screens the second sentence is the one that matters: it tells a founder the
 * books moved, which is the part they cannot see.
 *
 * The live region is `polite` and always mounted. Mounting it with the first
 * toast would mean the first one is never announced, because a screen reader
 * only reports changes *within* a region it was already watching.
 *
 * Not for errors that need a decision — those belong on the form, next to the
 * field, where they survive the 2.6 seconds this gives them.
 */
type Toast = { id: number; message: string; tone: 'default' | 'flag' };

const ToastContext = createContext<
  ((message: string, tone?: Toast['tone']) => void) | null
>(null);

const DISMISS_AFTER_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback(
    (message: string, tone: Toast['tone'] = 'default') => {
      const id = Date.now() + Math.random();

      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(
        () => setToasts((current) => current.filter((t) => t.id !== id)),
        DISMISS_AFTER_MS,
      );
    },
    [],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'animate-rise rounded-lg border border-border bg-card px-4 py-3',
              'text-sm shadow-float',
              toast.tone === 'flag' && 'border-flag/40',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);

  if (!show) {
    throw new Error('useToast must be used inside a ToastProvider');
  }

  return show;
}
