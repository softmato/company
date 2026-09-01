'use client';

import { useState, type ReactNode } from 'react';
import { Wordmark } from '@/components/public/wordmark';
import { FonepayIcon, EsewaIcon, KhaltiIcon } from '@/components/checkout/provider-icons';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CheckoutFlowProps {
  sessionId: string;
  invoiceNo?: string;
  productName?: string;
  productDescription?: string;
  customerName?: string;
  customerEmail?: string;
  amountMinor?: bigint | number;
  currency?: string;
  allowedProviders?: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PROVIDER_META: Record<string, { label: string; icon: ReactNode; tag: string }> = {
  fonepay: { label: 'Fonepay', icon: <FonepayIcon className="h-6 w-6" />, tag: 'Bank / QR' },
  esewa:   { label: 'eSewa',   icon: <EsewaIcon className="h-6 w-6" />,   tag: 'Wallet' },
  khalti:  { label: 'Khalti',  icon: <KhaltiIcon className="h-6 w-6" />,  tag: 'Wallet' },
};

function fmt(minor: bigint | number): string {
  return (Number(minor) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CheckoutFlow({
  sessionId,
  invoiceNo = 'INV-2083/84-00000001',
  productName = 'Softmato SaaS Platform',
  productDescription = 'Billed monthly',
  customerName = 'Partner Client',
  customerEmail = 'billing@partner.com',
  amountMinor = 2500000n,
  currency = 'NPR',
  allowedProviders = ['fonepay', 'esewa', 'khalti'],
}: CheckoutFlowProps) {
  const [selected, setSelected] = useState(allowedProviders[0] ?? 'fonepay');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const amount = fmt(amountMinor);

  const handlePay = async () => {
    setLoading(true);
    try {
      await fetch(`/api/v1/webhooks/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          providerId: selected,
          grossAmountMinor: amountMinor.toString(),
          status: 'succeeded',
        }),
      });
    } catch {
      /* sandbox fallback */
    }
    setDone(true);
    setLoading(false);
  };

  /* ================================================================ */
  /*  SUCCESS                                                          */
  /* ================================================================ */
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="headline text-xl font-semibold text-foreground">Payment successful</h1>
            <p className="text-sm text-muted-foreground">
              A receipt has been sent to{' '}
              <span className="font-medium text-foreground">{customerEmail}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 text-left text-[13px] space-y-3">
            <InfoRow label="Amount" value={`${currency} ${amount}`} mono bold />
            <InfoRow label="Invoice" value={invoiceNo} mono />
            <InfoRow label="Gateway" value={PROVIDER_META[selected]?.label ?? selected} />
            <InfoRow label="Reference" value={sessionId.slice(0, 24) + '…'} mono />
          </div>
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  CHECKOUT — full-screen two-column                                */
  /* ================================================================ */
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">

      {/* ---------------------------------------------------------- */}
      {/*  LEFT — dark order summary, fills the entire left half       */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-col justify-between bg-ink text-white px-8 py-10 sm:px-12 lg:px-16 lg:py-14">
        {/* Top: wordmark */}
        <Wordmark className="text-[18px] text-white" />

        {/* Middle: line items + totals */}
        <div className="my-auto max-w-md space-y-10">
          {/* Product */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-base">
              ✦
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium leading-snug">{productName}</p>
              <p className="text-[13px] text-white/45 mt-0.5">{productDescription}</p>
            </div>
            <p className="numeric text-[15px] font-medium whitespace-nowrap pl-4">
              {currency} {amount}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.08]" />

          {/* Breakdown */}
          <div className="space-y-4 text-[13px]">
            <div className="flex justify-between text-white/50">
              <span>Subtotal</span>
              <span className="numeric">{currency} {amount}</span>
            </div>
            <div className="flex justify-between text-white/50">
              <span>Tax</span>
              <span className="numeric">0.00</span>
            </div>
          </div>

          <div className="h-px bg-white/[0.08]" />

          {/* Total */}
          <div className="flex justify-between items-baseline">
            <span className="text-base font-semibold">Total</span>
            <span className="numeric text-2xl font-semibold tracking-tight">
              {currency} {amount}
            </span>
          </div>
        </div>

        {/* Bottom: invoice ref */}
        <p className="numeric text-[11px] text-white/30 mt-10">
          {invoiceNo} · {sessionId.slice(0, 16)}
        </p>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  RIGHT — light payment form, fills the entire right half     */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-col bg-background px-8 py-10 sm:px-12 lg:px-16 lg:py-14">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-10">

          {/* Contact information */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold text-foreground tracking-wide">
              Contact information
            </h2>
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              <div className="flex items-center gap-3 bg-card px-4 py-3.5 text-sm">
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-muted-foreground">Email</span>
                <span className="ml-auto font-medium text-foreground truncate">{customerEmail}</span>
              </div>
              <div className="flex items-center gap-3 bg-card px-4 py-3.5 text-sm">
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="text-muted-foreground">Billed to</span>
                <span className="ml-auto font-medium text-foreground truncate">{customerName}</span>
              </div>
            </div>
          </section>

          {/* Payment method */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold text-foreground tracking-wide">
              Payment method
            </h2>
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {allowedProviders.map((id) => {
                const meta = PROVIDER_META[id];
                const active = selected === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelected(id)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors ${
                      active ? 'bg-primary/[0.04]' : 'bg-card hover:bg-surface'
                    }`}
                  >
                    {/* Radio indicator */}
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        active ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    {meta?.icon}
                    <span className="font-medium text-foreground">{meta?.label ?? id}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{meta?.tag}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              {selected === 'fonepay' && 'You will be redirected to Fonepay to scan a QR code or authorize via your bank.'}
              {selected === 'esewa' && 'You will be redirected to eSewa to authorize the payment from your wallet.'}
              {selected === 'khalti' && 'You will be redirected to Khalti to complete payment via your wallet.'}
            </p>
          </section>

          {/* Spacer */}
          <div className="flex-1" />

          {/* CTA */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={handlePay}
              className="w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? 'Processing…' : `Pay ${currency} ${amount}`}
            </button>
            <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
              By paying, you authorize Softmato to charge you according to the terms until you cancel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny receipt row                                                   */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground ${mono ? 'numeric' : ''} ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
