/**
 * Documents to look at without a database.
 *
 * Two uses, and both matter. `pnpm doc:preview` writes these to HTML so the
 * layout can be worked on in a browser without logging into the admin panel
 * and without a payment having been made; and the tests render them, so a
 * change that breaks the void watermark or drops the amount-in-words line
 * fails in CI rather than in an inbox.
 *
 * They are **not** representative rows. Each one is chosen for a case that is
 * easy to get wrong and rare enough to never see by accident: an invoice with
 * two lines and a discount, one that has been voided, and a receipt for a part
 * payment where the balance is not zero.
 *
 * The figures are invented, and that is fine precisely because nothing here
 * claims to be a Softmato record — a sample invoice made from real customer
 * details would be the thing to avoid.
 */
import type { InvoiceDocument, Party, ReceiptDocument } from './types';

const SELLER: Party = {
  name: 'Softmato Technology Pvt. Ltd.',
  address: 'Sample Ward, Kathmandu, Nepal',
  pan: '999999999',
  email: 'billing@example.invalid',
  phone: '+977 1 0000000',
};

const CUSTOMER: Party = {
  name: 'Sample Hostels Pvt. Ltd.',
  address: 'New Baneshwor, Kathmandu',
  pan: '888888888',
  email: 'accounts@example.invalid',
  phone: null,
};

const ISSUED = new Date('2026-08-25T04:15:00.000Z');
const DUE = new Date('2026-09-09T04:15:00.000Z');

/** The ordinary case: issued, unpaid, one annual plan line. */
export const SAMPLE_INVOICE: InvoiceDocument = {
  kind: 'invoice',
  invoiceNo: 'INV-2083/84-000125',
  fiscalYear: '2083/84',
  seller: SELLER,
  customer: CUSTOMER,
  issuedAt: ISSUED,
  dueAt: DUE,
  lines: [
    {
      lineNo: 1,
      description: 'HostelHub — Annual Plan',
      periodStart: new Date('2026-08-25T00:00:00.000Z'),
      periodEnd: new Date('2027-08-24T00:00:00.000Z'),
      quantity: '1.000',
      unitPriceMinor: 2_000_000n,
      amountMinor: 2_000_000n,
    },
  ],
  subtotalMinor: 2_000_000n,
  discountMinor: 0n,
  taxMinor: 0n,
  totalMinor: 2_000_000n,
  paidMinor: 0n,
  dueMinor: 2_000_000n,
  currency: 'NPR',
  status: 'unpaid',
  presentation: {
    version: 1,
    plan_name: 'HostelHub Growth — Annual',
    tagline: 'For properties running more than one building.',
    features: [
      'Up to 500 beds across unlimited properties',
      'Nightly off-site backups, restorable to any point in 30 days',
      'Guest check-in and check-out from a phone',
      'Staff accounts with per-role permissions',
    ],
    highlights: ['Priority support', 'Free onboarding'],
    billing_period: '12 months',
  },
  renderedFromLiveParties: false,
};

/** Several lines, a discount, and a part payment — the busiest the table gets. */
export const SAMPLE_INVOICE_PART_PAID: InvoiceDocument = {
  ...SAMPLE_INVOICE,
  invoiceNo: 'INV-2083/84-000126',
  lines: [
    ...SAMPLE_INVOICE.lines,
    {
      lineNo: 2,
      description: 'Additional staff seats',
      periodStart: new Date('2026-08-25T00:00:00.000Z'),
      periodEnd: new Date('2027-08-24T00:00:00.000Z'),
      quantity: '5.000',
      unitPriceMinor: 250_000n,
      amountMinor: 1_250_000n,
    },
    {
      lineNo: 3,
      description: 'Data migration — one-off',
      periodStart: null,
      periodEnd: null,
      quantity: '1.000',
      unitPriceMinor: 500_000n,
      amountMinor: 500_000n,
    },
  ],
  subtotalMinor: 3_750_000n,
  discountMinor: 250_000n,
  taxMinor: 0n,
  totalMinor: 3_500_000n,
  paidMinor: 1_500_000n,
  dueMinor: 2_000_000n,
  status: 'partially_paid',
};

/** Voided: keeps its number, carries the watermark, still auditable. */
export const SAMPLE_INVOICE_VOID: InvoiceDocument = {
  ...SAMPLE_INVOICE,
  invoiceNo: 'INV-2083/84-000127',
  status: 'void',
};

/** Paid in full. The receipt a customer gets for a settled invoice. */
export const SAMPLE_RECEIPT: ReceiptDocument = {
  kind: 'receipt',
  receiptNo: 'TXN-2083/84-00000008',
  invoiceNo: 'INV-2083/84-000125',
  fiscalYear: '2083/84',
  seller: SELLER,
  customer: CUSTOMER,
  amountMinor: 2_000_000n,
  currency: 'NPR',
  providerName: 'eSewa',
  providerRef: '000GYAH',
  paidAt: new Date('2026-08-26T08:47:00.000Z'),
  forDescription: 'HostelHub — Annual Plan',
  invoiceTotalMinor: 2_000_000n,
  totalReceivedMinor: 2_000_000n,
  balanceDueMinor: 0n,
  journalNo: 'JE-2083/84-000013',
  renderedFromLiveParties: false,
};

/** A part payment, where the badge and the balance both have to change. */
export const SAMPLE_RECEIPT_PARTIAL: ReceiptDocument = {
  ...SAMPLE_RECEIPT,
  receiptNo: 'TXN-2083/84-00000009',
  invoiceNo: 'INV-2083/84-000126',
  amountMinor: 1_500_000n,
  providerName: 'Khalti',
  providerRef: 'FHAwbiLzoRvq4jDon6hWha',
  invoiceTotalMinor: 3_500_000n,
  totalReceivedMinor: 1_500_000n,
  balanceDueMinor: 2_000_000n,
};
