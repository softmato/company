/**
 * The note a customer gets once their refund has been paid back.
 *
 * Pure: it renders, it does not send. The admin's own message is typed into a
 * form, so it goes through `paragraph()`'s escaping like everything else.
 */
import type { PaidRefund } from '@softmato/payment-core';

import { formatNpr } from '@/lib/format/money';

import { layout, paragraph } from '../html';
import type { DetailRow } from '../html';
import type { EmailTemplate } from '../types';

export function refundIssuedEmail(
  refund: PaidRefund,
  message: string,
  paidAt: Date,
): EmailTemplate {
  const amount =
    refund.currency === 'NPR'
      ? formatNpr(refund.amountMinor)
      : `${refund.currency} ${refund.amountMinor.toString()}`;

  const rows: DetailRow[] = [
    { label: 'Refund', value: refund.refundNo },
    { label: 'Amount', value: amount },
    { label: 'Refunded to', value: refund.providerName },
    { label: 'Reference', value: refund.providerRefundId },
    { label: 'Payment', value: refund.txnNo },
    { label: 'Invoice', value: refund.invoiceNo },
    { label: 'Date', value: paidAt.toISOString().slice(0, 10) },
  ];

  const lead =
    `Hello ${refund.customerName}, we have sent your refund of ${amount} ` +
    `through ${refund.providerName}. The reference is ` +
    `${refund.providerRefundId}. Thank you.`;
  const note = message.trim();

  return {
    category: 'billing',
    subject: `Refund sent — ${amount} (${refund.refundNo})`,
    html: layout({
      eyebrow: 'Refund',
      heading: `Refund ${refund.refundNo}`,
      rows,
      body: paragraph(note ? `${lead}\n\n${note}` : lead),
      footer: 'Softmato Technology Pvt Ltd',
    }),
    text: [
      lead,
      ...(note ? ['', note] : []),
      '',
      ...rows.map(({ label, value }) => `${label.padEnd(12)} ${value}`),
      '',
      'Softmato Technology Pvt Ltd',
    ].join('\n'),
  };
}
