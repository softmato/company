import { describe, expect, it } from 'vitest';

import { buildReceipt } from '../receipts/receipt';

const INPUT = {
  txnNo: 'TXN-2083/84-00000001',
  invoiceNo: 'INV-2083/84-000001',
  payerName: 'Bina Shrestha',
  payerEmail: 'bina@example.com',
  amountMinor: 12_000_00n,
  currency: 'NPR',
  providerName: 'Fonepay',
  providerRef: 'fp_abc123',
  paidAt: new Date('2026-08-16T10:00:00Z'),
  journalNo: 'JE-2083/84-000042',
};

describe('buildReceipt', () => {
  /**
   * There is no separate receipt sequence. The transaction number is already
   * gapless per fiscal year, and two numbers for one payment is how a customer
   * and an accountant end up quoting different references for the same money.
   */
  it('uses the transaction number as the receipt number', () => {
    expect(buildReceipt(INPUT).receiptNo).toBe(INPUT.txnNo);
  });

  /**
   * The gross — what left the customer's account. The provider's fee is our
   * cost, and a receipt for the net would understate what they are owed if the
   * payment is later refunded.
   */
  it('states the gross amount the customer paid', () => {
    expect(buildReceipt(INPUT).amountMinor).toBe(12_000_00n);
  });

  it('carries what a customer needs to match it against their statement', () => {
    const receipt = buildReceipt(INPUT);

    expect(receipt.invoiceNo).toBe(INPUT.invoiceNo);
    expect(receipt.providerName).toBe('Fonepay');
    expect(receipt.providerRef).toBe('fp_abc123');
    expect(receipt.paidAt).toEqual(INPUT.paidAt);
  });

  it('keeps the journal reference for the internal trail', () => {
    expect(buildReceipt(INPUT).journalNo).toBe('JE-2083/84-000042');
  });

  // A SaaS is not obliged to give us an email address. The payment is complete
  // either way; there is simply nowhere to send the receipt.
  it('accepts a payer with no email address', () => {
    const receipt = buildReceipt({ ...INPUT, payerEmail: null });

    expect(receipt.payerEmail).toBeNull();
    expect(receipt.receiptNo).toBe(INPUT.txnNo);
  });

  it('accepts a payment with no provider reference', () => {
    expect(
      buildReceipt({ ...INPUT, providerRef: null }).providerRef,
    ).toBeNull();
  });
});
