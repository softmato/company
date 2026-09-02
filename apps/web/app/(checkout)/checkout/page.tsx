/**
 * payment.softmato.com — the bare subdomain.
 *
 * The proxy rewrites this host onto `/checkout`, and until now only
 * `/checkout/[sessionId]` existed, so anyone landing on the root got the
 * application's generic 404 — a page carrying the marketing navigation, on a
 * hostname that has nothing to do with marketing.
 *
 * There is nothing to *do* here by design. A checkout page is reachable only
 * through the session-specific link a merchant was given by
 * `POST /api/v1/checkout`; there is no invoice lookup, no "enter your
 * reference" box, and there should not be. Such a box would let a stranger
 * probe for valid sessions, and every session id is already a bearer token for
 * one payment.
 *
 * So this says what the subdomain is, tells someone who arrived by mistake
 * where to go, and offers no input.
 */
import type { Metadata } from 'next';

import { Wordmark } from '@/components/public/wordmark';

export const metadata: Metadata = {
  title: 'Payments',
  robots: { index: false, follow: false },
};

export default function CheckoutRootPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Wordmark className="text-[18px]" />

      <div className="max-w-sm space-y-2">
        <h1 className="headline text-xl font-semibold text-foreground">
          Softmato payments
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This is where Softmato invoices are paid. Payment pages open from the
          link on your invoice — there is nothing to enter here.
        </p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Lost your link, or think it expired?{' '}
        <a
          className="font-medium text-foreground underline underline-offset-4"
          href="https://softmato.com/contact"
        >
          Get in touch
        </a>{' '}
        and we will send a new one.
      </p>
    </main>
  );
}
