'use client';

/**
 * Handing the customer over to a gateway that must be entered by form POST.
 *
 * eSewa's ePay v2 signs its field *values*, so they have to arrive exactly as
 * they were signed and it accepts them as a POST body. A link cannot express
 * that, which is why `InitiateResult` grew a `formPost` and why this component
 * exists rather than a `redirect()`.
 *
 * It submits itself on mount and renders a visible fallback button, because
 * an automatic submit is precisely the thing a browser may decline to do — a
 * blocked script, or a `requestSubmit` the user's settings refuse. Leaving the
 * customer on a blank page holding a booked payment intent is the failure that
 * fallback prevents.
 *
 * Nothing here is secret: every field is a public value, and the signature is
 * good for this one transaction.
 */
import { useEffect, useRef } from 'react';

import type { FormPost } from '@softmato/payment-core';

export function GatewayForm({ formPost }: { formPost: FormPost }) {
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    form.current?.requestSubmit();
  }, []);

  return (
    <form
      ref={form}
      action={formPost.url}
      method="POST"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center"
    >
      {Object.entries(formPost.fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none"
        aria-hidden
      />

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Taking you to your payment provider…
        </p>
        <p className="text-xs text-muted-foreground">
          Do not close this window.
        </p>
      </div>

      <button
        type="submit"
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
      >
        Continue manually
      </button>
    </form>
  );
}
