'use client';

/**
 * The light half of the checkout page: who is paying, how, and the button.
 *
 * **Every prop is required.** The version this replaces defaulted all of them
 * — an invoice number, a customer, an amount — so a page that passed nothing
 * still rendered a complete and entirely fictional checkout. Defaults on a
 * payment screen are a way of not noticing that the data never arrived.
 *
 * There is no success state here either. This component's job ends when the
 * customer is handed to a gateway; whether they paid is decided server-side by
 * the callback route asking the gateway directly. The old `handlePay` set
 * `done = true` and drew a receipt reading "A receipt has been sent to…"
 * without anything having been sent, charged, or recorded.
 */
import { useState, useTransition } from 'react';

import { beginPayment } from '@/app/(checkout)/checkout/[sessionId]/actions';
import { GatewayForm } from '@/components/checkout/gateway-form';
import { ProviderPicker } from '@/components/checkout/provider-picker';
import type { CheckoutProvider } from '@/lib/checkout/view';
import { formatPaisa } from '@/lib/format/money';
import type { FormPost } from '@softmato/payment-core';

interface CheckoutFlowProps {
  sessionId: string;
  customerName: string;
  customerEmail: string | null;
  amountMinor: bigint;
  currency: string;
  providers: CheckoutProvider[];
}

export function CheckoutFlow({
  sessionId,
  customerName,
  customerEmail,
  amountMinor,
  currency,
  providers,
}: CheckoutFlowProps) {
  const [selected, setSelected] = useState(providers[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [handover, setHandover] = useState<FormPost | null>(null);
  const [pending, startTransition] = useTransition();

  // Once a gateway form exists the customer is leaving; nothing else renders.
  if (handover) return <GatewayForm formPost={handover} />;

  function pay(): void {
    if (!selected) return;

    setError(null);

    startTransition(async () => {
      const result = await beginPayment(sessionId, selected!);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (result.kind === 'form') {
        setHandover(result.formPost);
        return;
      }

      /*
       * A full assignment rather than a router push: the destination is a
       * payment provider, not a route in this app, and Next's router would
       * try to treat it as one.
       */
      window.location.href = result.url;
    });
  }

  return (
    <div className="flex flex-col bg-background px-8 py-10 sm:px-12 lg:px-16 lg:py-14">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-10">
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold tracking-wide text-foreground">
            Billed to
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            <Row label="Name" value={customerName} />
            {/* Rendered only when there is one — never an invented address. */}
            {customerEmail ? <Row label="Email" value={customerEmail} /> : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold tracking-wide text-foreground">
            Payment method
          </h2>

          {providers.length > 0 ? (
            <ProviderPicker
              providers={providers}
              selected={selected}
              onSelect={setSelected}
              disabled={pending}
            />
          ) : (
            /*
             * Reachable: a session may allow providers whose adapters are not
             * registered, and the page intersects the two lists rather than
             * drawing a button that throws. Saying so plainly beats an empty
             * box above a dead button.
             */
            <p className="rounded-xl border border-border bg-surface px-4 py-3.5 text-sm text-muted-foreground">
              No payment method is available for this invoice right now. Please
              contact us and we will arrange another way to pay.
            </p>
          )}
        </section>

        <div className="flex-1" />

        <div className="space-y-3">
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={pending || !selected}
            onClick={pay}
            className="w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {pending
              ? 'Starting…'
              : `Pay ${currency} ${formatPaisa(amountMinor)}`}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            You will complete this payment on your provider&rsquo;s own secure
            page. Softmato never sees your wallet or card credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto truncate font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
