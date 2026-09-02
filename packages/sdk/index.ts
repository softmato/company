/**
 * `@softmato/sdk` — the typed client SaaS products install.
 *
 * ```ts
 * import { SoftmatoClient, verifyWebhook } from '@softmato/sdk';
 *
 * const softmato = new SoftmatoClient({ secret: process.env.SOFTMATO_SECRET! });
 *
 * const invoice = await softmato.createInvoice({
 *   external_ref: 'HH-2026-00123',
 *   customer: { external_ref: 'cust_88', name: 'Ram Sharma' },
 *   lines: [{ description: 'Standard — 12 months', quantity: 1, unit_price_minor: 1200000 }],
 * });
 *
 * const { checkout_url } = await softmato.createCheckout({
 *   invoice_id: invoice.invoice_id,
 * });
 * ```
 *
 * Then, in your webhook route — verifying the **raw** body before reading it:
 *
 * ```ts
 * const raw = await request.text();
 * const result = verifyWebhook({
 *   secret: process.env.SOFTMATO_WEBHOOK_SECRET!,
 *   body: raw,
 *   signature: request.headers.get('x-softmato-signature'),
 *   timestamp: request.headers.get('x-softmato-timestamp'),
 * });
 *
 * if (!result.valid) return new Response('invalid', { status: 400 });
 * if (result.payload.event === 'payment.success') await provision(result.payload);
 * ```
 *
 * Zero runtime dependencies: `fetch` and `node:crypto`.
 */
export { SoftmatoClient, type SoftmatoOptions } from './client.js';

export {
  API_ERROR_CODES,
  SoftmatoApiError,
  SoftmatoTransportError,
  isApiErrorCode,
  type ApiErrorCode,
} from './errors.js';

export {
  WEBHOOK_EVENTS,
  isWebhookEvent,
  type WebhookEvent,
  type WebhookPayload,
} from './events.js';

export {
  MAX_AGE_SECONDS,
  SHARED_VECTOR,
  isEvent,
  sign,
  signingBase,
  verifyWebhook,
  type VerifyFailure,
  type VerifyInput,
  type VerifyResult,
} from './webhooks.js';

export type {
  CheckoutSession,
  CreateCheckoutInput,
  CreateInvoiceInput,
  CreateRefundInput,
  CustomerInput,
  DocumentFile,
  DocumentParty,
  Invoice,
  InvoiceDetail,
  InvoiceDocumentLine,
  InvoiceLineInput,
  Presentation,
  ReceiptDetail,
  RefundRequest,
  TransactionView,
} from './types.js';
