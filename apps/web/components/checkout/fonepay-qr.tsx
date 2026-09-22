'use client';

/**
 * Checkout by Fonepay: scan the QR, or — on a phone — open a banking app with
 * the payment already loaded.
 *
 * Nothing here decides an outcome. The page asks the server, which asks
 * Fonepay; Fonepay's WebSocket is unsigned, so a message on it only hurries
 * that check. Brand rules (docs/fonepay/README.md): always "Checkout by
 * Fonepay", the logo over the QR, Check Status in Fonepay red, how-to-pay
 * steps, a searchable bank list, and the bank's own wording when an app will
 * not open.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { checkPayment } from '@/app/(checkout)/checkout/[sessionId]/check-payment';
import { ProviderMark } from '@/components/brand/provider-mark';
import type { BankApp } from '@softmato/payment-core';

interface FonepayQrProps {
  sessionId: string;
  qrSvg: string;
  socketUrl?: string;
  bankApps: BankApp[];
}

/** The line under the QR. Busy states get a pulsing dot. */
const NOTES = {
  waiting: 'Waiting for your payment…',
  checking: 'Checking with Fonepay…',
  paid: 'Payment received. Opening your receipt…',
  pending: 'No payment yet. This page updates by itself once you pay.',
  unreachable:
    'We could not reach Fonepay just now. Please check again in a moment.',
  noApp:
    "Your selected mobile banking app or wallet isn't available right now. Please choose another BFI option to continue your payment.",
} as const;

const BUSY = new Set<keyof typeof NOTES>(['waiting', 'checking', 'paid']);

/**
 * Fonepay's status API showed a payment ~2 s after it was made; its socket
 * took 15 s and reached one of three listeners (2026-09-21). So the page
 * polls, and the socket only hurries the next check. A scan sends nothing
 * anywhere, so there is no "scanned" state to show.
 */
const POLL_MS = 3000;

export function FonepayQr({
  sessionId,
  qrSvg,
  socketUrl,
  bankApps,
}: FonepayQrProps) {
  const [note, setNote] = useState<keyof typeof NOTES>('waiting');
  const [query, setQuery] = useState('');
  const [checking, startCheck] = useTransition();
  const router = useRouter();
  const busy = useRef(false);

  /** `quiet` for the background checks: only an outcome changes the note. */
  async function check(quiet: boolean): Promise<void> {
    if (quiet && busy.current) return;
    busy.current = true;
    if (!quiet) setNote('checking');

    const result = await checkPayment(sessionId).catch(
      () => 'unreachable' as const,
    );

    if (result === 'pending' || result === 'unreachable') {
      busy.current = false;
      if (!quiet) setNote(result);
      return;
    }

    // Stays busy: the page is leaving. The callback page confirms again,
    // server-side, and shows the outcome.
    if (result === 'paid') setNote('paid');
    router.push(`/checkout/${sessionId}/callback`);
  }

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === 'visible') void check(true);
    };
    const timer = setInterval(poll, POLL_MS);
    // Back from the banking app on a phone: check at once.
    document.addEventListener('visibilitychange', poll);
    const socket = socketUrl ? new WebSocket(socketUrl) : undefined;
    if (socket) socket.onmessage = poll;

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `check` closes over stable values only (router included)
  }, [socketUrl]);

  /** A page still visible moments after the tap means no app took the link. */
  function openApp(): void {
    setTimeout(() => {
      if (document.visibilityState === 'visible') setNote('noApp');
    }, 2500);
  }

  const shown = bankApps.filter((app) =>
    app.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col bg-background px-8 py-10 sm:px-12 lg:px-16 lg:py-14">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <ProviderMark id="fonepay" size={36} />
          <h2 className="text-lg font-semibold text-foreground">
            Checkout by Fonepay
          </h2>
        </div>

        {bankApps.length > 0 ? (
          <section className="space-y-3 md:hidden">
            <h3 className="text-[13px] font-semibold tracking-wide text-foreground">
              Pay with your banking app
            </h3>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your bank or wallet"
              aria-label="Search your bank or wallet"
              className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {shown.map((app) => (
                <li key={app.deeplink}>
                  <a
                    href={app.deeplink}
                    onClick={openApp}
                    className="flex items-center gap-3 bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-surface"
                  >
                    {app.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote host is Fonepay's, not configurable
                      <img
                        src={app.icon}
                        alt=""
                        className="size-8 object-contain"
                      />
                    ) : null}
                    {app.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col items-center gap-3">
          <h3 className="text-[13px] font-semibold tracking-wide text-foreground md:hidden">
            {bankApps.length > 0 ? 'Or scan the QR' : 'Scan the QR'}
          </h3>
          <div
            role="img"
            aria-label="Fonepay payment QR code"
            className="w-60 rounded-xl border border-border bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
            // Our own SVG, drawn server-side from Fonepay's payload.
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p
            role="status"
            className="flex items-center gap-2 text-center text-sm font-medium text-foreground"
          >
            {BUSY.has(note) ? (
              <span
                aria-hidden
                className="size-2 shrink-0 animate-pulse rounded-full bg-[#ce2027]"
              />
            ) : null}
            {NOTES[note]}
          </p>
        </section>

        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Open your mobile banking app or wallet.</li>
          <li>Scan this QR, or pick your bank above on a phone.</li>
          <li>Check the amount and approve the payment.</li>
          <li>
            This page moves on by itself. If it does not, press Check Status.
          </li>
        </ol>

        <div className="flex-1" />

        <button
          type="button"
          disabled={checking}
          onClick={() => startCheck(() => check(false))}
          className="w-full rounded-lg bg-[#ce2027] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#b41c22] disabled:opacity-50"
        >
          Check Status
        </button>
      </div>
    </div>
  );
}
