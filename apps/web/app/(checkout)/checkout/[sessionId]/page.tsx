/**
 * payment.softmato.com/checkout/<sessionId>
 *
 * The page this replaces read nothing. It passed a hardcoded invoice number,
 * a customer named "Himalayan Tech Pvt Ltd" and `2500000n` straight into the
 * component, so every checkout URL in existence rendered the same fictional
 * NPR 25,000 charge — including ids that had never been issued.
 *
 * Now the session is the only source: the amount comes from the row, which
 * computed it from the invoice at creation, and the provider list is what the
 * session allows intersected with what actually has an adapter behind it.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { CheckoutNotice } from '@/components/checkout/checkout-notice';
import { OrderSummary } from '@/components/checkout/order-summary';
import { checkoutView } from '@/lib/checkout/view';

/**
 * A payment page is per-customer and per-moment: it settles expiry on read and
 * its provider list depends on runtime registration. Caching it would show one
 * customer another's invoice.
 */
export const dynamic = 'force-dynamic';

/**
 * Never indexed, and no invoice details in the title. A checkout URL is a
 * bearer token for one payment.
 */
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
}: PageProps<'/checkout/[sessionId]'>) {
  const { sessionId } = await params;
  const view = await checkoutView(sessionId);

  /*
   * A session that does not exist and one whose supporting rows are missing
   * get the same 404 — the answer someone guessing session ids also gets, so
   * it distinguishes nothing for them.
   */
  if (view.state === 'unknown') notFound();

  if (view.state === 'paid') {
    return (
      <CheckoutNotice
        tone="good"
        title="This invoice is already paid"
        body="No further payment is needed. A receipt was emailed when the payment was confirmed."
        invoiceNo={view.invoiceNo}
      />
    );
  }

  if (view.state === 'expired') {
    return (
      <CheckoutNotice
        tone="neutral"
        title="This payment link has expired"
        body="Checkout links are short-lived for security. Ask for a new one and the invoice will be payable again."
        invoiceNo={view.invoiceNo}
      />
    );
  }

  if (view.state === 'closed') {
    return (
      <CheckoutNotice
        tone="neutral"
        title="This payment link is closed"
        body="It was cancelled or a payment against it did not complete. Ask for a new link to try again."
        invoiceNo={view.invoiceNo}
      />
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <OrderSummary
        productName={view.productName}
        invoiceNo={view.invoiceNo}
        sessionId={view.sessionId}
        amountMinor={view.amountMinor}
        currency={view.currency}
        presentation={view.presentation}
      />

      <CheckoutFlow
        sessionId={view.sessionId}
        customerName={view.customerName}
        customerEmail={view.customerEmail}
        amountMinor={view.amountMinor}
        currency={view.currency}
        providers={view.providers}
      />
    </div>
  );
}
