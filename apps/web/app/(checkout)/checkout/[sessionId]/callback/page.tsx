/**
 * Where a provider returns the customer after they have paid.
 *
 * **Every query parameter on this URL is ignored.** Not read and discarded —
 * there is no `searchParams` in this component at all, so there is nothing to
 * accidentally trust later. Khalti appends `status=Completed`, eSewa appends a
 * signed `data` blob, and neither is consulted: the session id in the path is
 * used to find our own transaction row, and the provider is asked directly
 * over our own authenticated connection.
 *
 * That is PHASES.md Phase 4 acceptance 2 — "hitting the return URL with a
 * forged `status=Completed` marks nothing paid" — and it holds because
 * forging a parameter changes nothing about what this page does.
 *
 * The customer sees the real outcome, including the two that are not "paid":
 * a payment still pending at the gateway, and one held for review because the
 * amounts disagreed. Neither is dressed up as success.
 *
 * The way back to the product is a **link**, on every outcome, and never a
 * redirect — auto-forwarding would carry someone straight past "please do not
 * pay again". It carries no status parameter either: the product learns what
 * happened from the webhook. See `lib/checkout/return-link.ts`.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CheckoutNotice } from '@/components/checkout/checkout-notice';
import { confirmSessionPayment } from '@/lib/checkout/confirm';
import { returnLinkFor } from '@/lib/checkout/return-link';
import { checkoutView } from '@/lib/checkout/view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirming payment',
  robots: { index: false, follow: false },
};

export default async function CallbackPage({
  params,
}: PageProps<'/checkout/[sessionId]/callback'>) {
  const { sessionId } = await params;

  const [outcome, view, returnLink] = await Promise.all([
    confirmSessionPayment(sessionId),
    checkoutView(sessionId),
    // Re-checked against the allowlist here, not when the session was created.
    returnLinkFor(sessionId),
  ]);

  if (view.state === 'unknown') notFound();

  const invoiceNo = view.invoiceNo;

  if (outcome.state === 'settled') {
    return (
      <CheckoutNotice
        tone="good"
        title="Payment received"
        body={
          view.customerEmail
            ? `Thank you. A receipt has been sent to ${view.customerEmail}.`
            : 'Thank you. Your payment has been recorded against this invoice.'
        }
        invoiceNo={invoiceNo}
        returnLink={returnLink}
      />
    );
  }

  if (outcome.state === 'pending') {
    return (
      <CheckoutNotice
        tone="neutral"
        title="Your payment is still being confirmed"
        body="Your provider has not finished processing it. This usually settles within a few minutes, and we will email a receipt as soon as it does — there is no need to pay again."
        invoiceNo={invoiceNo}
        returnLink={returnLink}
      />
    );
  }

  /*
   * Shown plainly rather than hidden behind "something went wrong".
   *
   * A held payment means money may well have left the customer's account while
   * our records disagree about how much. Telling them it failed would invite a
   * second payment; telling them nothing leaves them watching a balance drop
   * with no explanation. Never auto-resolved (RULES.md §2.8).
   */
  if (outcome.state === 'reconciliation') {
    return (
      <CheckoutNotice
        tone="neutral"
        title="This payment is being reviewed"
        body="We have recorded it and a person is checking it. Please do not pay again — if anything is owed or owing, we will contact you."
        invoiceNo={invoiceNo}
        returnLink={returnLink}
      />
    );
  }

  if (outcome.state === 'closed') {
    return (
      <CheckoutNotice
        tone="neutral"
        title="This payment did not complete"
        body="Your provider reported that it was not completed, and you have not been charged. Ask for a new payment link to try again."
        invoiceNo={invoiceNo}
        returnLink={returnLink}
      />
    );
  }

  /*
   * `no-attempt`: the callback was reached without a payment ever having been
   * started. The session itself may still be perfectly payable, so this points
   * back at it rather than declaring anything failed.
   */
  return (
    <CheckoutNotice
      tone="neutral"
      title="No payment to confirm"
      body="We have no record of a payment being started from this link. If you were charged, contact us and we will trace it."
      invoiceNo={invoiceNo}
      returnLink={returnLink}
    />
  );
}
