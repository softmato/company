/**
 * payment.softmato.com/checkout/<sessionId>
 *
 * High-fidelity, clean Checkout Interface.
 * Loads payment session details, invoice amounts, customer info, and provider selector.
 */
import { CheckoutFlow } from '@/components/checkout/checkout-flow';

export default async function CheckoutPage({
  params,
}: PageProps<'/checkout/[sessionId]'>) {
  const { sessionId } = await params;

  return (
    <CheckoutFlow
      sessionId={sessionId}
      invoiceNo="INV-2083/84-00000001"
      productName="Softmato Enterprise SaaS License"
      customerName="Himalayan Tech Pvt Ltd"
      customerEmail="billing@himalayantech.com"
      amountMinor={2500000n}
      currency="NPR"
      allowedProviders={['fonepay', 'esewa', 'khalti']}
    />
  );
}
