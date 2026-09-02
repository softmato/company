import 'server-only';

import type { Receipt } from '@softmato/payment-core';

import { receiptAttachment } from '@/lib/documents/attachment';
import { buildReceiptDocument } from '@/lib/documents/receipt-document';
import { sendEmail } from '@/lib/email/send';
import { paymentReceiptEmail } from '@/lib/email/templates/payment-receipt';

/**
 * Delivers a receipt to whoever paid.
 *
 * This is the `ReceiptSender` that `completePayment()` takes, and it exists in
 * the app rather than in `payment-core` because the package may not import
 * `server-only` code (docs/FOLDER_STRUCTURE.md).
 *
 * **It never throws, and that is the contract.** By the time it runs the money
 * has moved and the journal is posted; letting a mail failure escape would
 * roll back a confirmed payment over an email — turning a delivery problem
 * into an accounting one. `sendEmail()` already swallows and reports, and the
 * only job here is not to reintroduce a throw above it.
 *
 * A payer with no email address is a normal case, not an error: a SaaS is not
 * obliged to give us one. The payment is complete either way; there is simply
 * nowhere to send the receipt.
 */
export async function sendPaymentReceipt(receipt: Receipt): Promise<void> {
  if (!receipt.payerEmail) {
    console.info(
      `[receipt] ${receipt.receiptNo}: payer has no email address; nothing sent`,
    );
    return;
  }

  /*
   * The PDF is the document; the email body is a covering note. Both are sent,
   * because a customer forwarding "my receipt" to their accountant should be
   * forwarding a file rather than a web page — and because the email body is
   * the only copy that survives if the attachment is stripped by a mail
   * gateway.
   *
   * A missing attachment never stops the send. `receiptAttachment` returns
   * null instead of throwing for exactly this reason: by the time this runs
   * the journal is posted, and a PDF engine having a bad minute must not turn
   * a delivery problem into an accounting one.
   */
  const document = await buildReceiptDocument(receipt.receiptNo);
  const attachment = document ? await receiptAttachment(document) : null;

  if (!attachment) {
    console.warn(
      `[receipt] ${receipt.receiptNo}: sending without a PDF attachment`,
    );
  }

  const result = await sendEmail({
    to: receipt.payerEmail,
    template: paymentReceiptEmail(receipt),
    ...(attachment ? { attachments: [attachment] } : {}),
  });

  if (!result.sent) {
    // Logged, never thrown. The receipt can be resent from the admin panel;
    // the payment stays confirmed regardless.
    console.error(
      `[receipt] ${receipt.receiptNo}: not sent — ${result.reason ?? 'unknown'}`,
    );
  }
}
