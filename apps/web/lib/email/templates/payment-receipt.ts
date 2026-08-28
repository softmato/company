/**
 * The receipt a payer gets when their payment is confirmed (docs/API.md §6).
 *
 * Pure: it renders, it does not send.
 *
 * The amount shown is the **gross** — what left the customer's account. The
 * provider's fee is our cost, not a deduction from what they paid, and a
 * receipt quoting the net would understate what they are owed if the payment
 * is ever refunded.
 *
 * Nothing here is typed by a stranger — every field comes from our own ledger —
 * but it all goes through the same escaping anyway. A customer's name is
 * whatever they told a SaaS product it was, and that is close enough to
 * untrusted to treat as untrusted.
 */
import type { Receipt } from '@softmato/payment-core';

import { formatNpr } from '@/lib/format/money';

import { layout, paragraph } from '../html';
import type { DetailRow } from '../html';
import type { EmailTemplate } from '../types';

const DASH = '—';

export function paymentReceiptEmail(receipt: Receipt): EmailTemplate {
  const amount =
    receipt.currency === 'NPR'
      ? formatNpr(receipt.amountMinor)
      : `${receipt.currency} ${receipt.amountMinor.toString()}`;

  const rows: DetailRow[] = [
    { label: 'Receipt', value: receipt.receiptNo },
    { label: 'Invoice', value: receipt.invoiceNo },
    { label: 'Amount', value: amount },
    { label: 'Paid with', value: receipt.providerName },
    { label: 'Reference', value: receipt.providerRef ?? DASH },
    { label: 'Date', value: receipt.paidAt.toISOString().slice(0, 10) },
  ];

  const body = paragraph(
    `Thank you, ${receipt.payerName}. We have received your payment of ` +
      `${amount} against invoice ${receipt.invoiceNo}. This email is your ` +
      `receipt — keep it for your records.`,
  );

  return {
    subject: `Payment received — ${amount} (${receipt.receiptNo})`,
    html: layout({
      eyebrow: 'Payment receipt',
      heading: `Receipt ${receipt.receiptNo}`,
      rows,
      body,
      footer: 'Softmato Technology Pvt Ltd',
    }),
    text: [
      `Thank you, ${receipt.payerName}.`,
      '',
      `We have received your payment of ${amount} against invoice ${receipt.invoiceNo}.`,
      'This email is your receipt — keep it for your records.',
      '',
      ...rows.map(({ label, value }) => `${label.padEnd(10)} ${value}`),
      '',
      'Softmato Technology Pvt Ltd',
    ].join('\n'),
  };
}
