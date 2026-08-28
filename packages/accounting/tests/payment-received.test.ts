/**
 * docs/CHART_OF_ACCOUNTS.md §9.2 — a gateway payment is confirmed.
 *
 * The worked example from the chart:
 *
 *     Dr  1032  Khalti Merchant Wallet         11,760
 *     Dr  5010  Payment Provider Fees             240
 *         Cr  1110  AR — SaaS Subscriptions            12,000
 */
import { describe, expect, it } from 'vitest';

import { AccountingError } from '../errors';
import { paymentReceivedJournal } from '../rules/payment-received';

const BASE = {
  transactionId: 7,
  txnNo: 'TXN-2083/84-00000001',
  invoiceNo: 'INV-2083/84-000001',
  productId: 'hostelhub',
  customerId: 3,
  balanceAccount: '1032',
  feeAccount: '5010',
  receivableAccount: '1110',
  grossAmountMinor: 12_000_00n,
  providerFeeMinor: 240_00n,
  occurredAt: new Date('2026-08-16T10:00:00Z'),
};

function lineFor(journal: ReturnType<typeof paymentReceivedJournal>, code: string) {
  return journal.lines.find((line) => line.accountCode === code);
}

describe('paymentReceivedJournal', () => {
  it('posts the worked example from §9.2', () => {
    const journal = paymentReceivedJournal(BASE);

    expect(lineFor(journal, '1032')).toMatchObject({
      direction: 'debit',
      amountMinor: 11_760_00n,
    });
    expect(lineFor(journal, '5010')).toMatchObject({
      direction: 'debit',
      amountMinor: 240_00n,
    });
    expect(lineFor(journal, '1110')).toMatchObject({
      direction: 'credit',
      amountMinor: 12_000_00n,
    });
  });

  it('balances', () => {
    const journal = paymentReceivedJournal(BASE);

    const signed = journal.lines.reduce(
      (sum, line) =>
        sum + (line.direction === 'debit' ? line.amountMinor : -line.amountMinor),
      0n,
    );

    expect(signed).toBe(0n);
  });

  /**
   * The credit is what the customer owed, not what we netted. Crediting the
   * net would leave the fee as debt still attached to a customer who paid in
   * full.
   */
  it('clears the receivable by the gross, never the net', () => {
    const journal = paymentReceivedJournal(BASE);

    expect(lineFor(journal, '1110')?.amountMinor).toBe(BASE.grossAmountMinor);
  });

  /** docs/RULES.md §2.7 — the fee is reported, never computed. */
  it('passes the reported fee through untouched, however odd', () => {
    const journal = paymentReceivedJournal({
      ...BASE,
      providerFeeMinor: 237_43n,
    });

    expect(lineFor(journal, '5010')?.amountMinor).toBe(237_43n);
    expect(lineFor(journal, '1032')?.amountMinor).toBe(12_000_00n - 237_43n);
  });

  // `postJournal` refuses a zero-amount line, and a fee line for nothing is
  // noise in the ledger regardless.
  it('omits the fee line entirely when there is no fee', () => {
    const journal = paymentReceivedJournal({ ...BASE, providerFeeMinor: 0n });

    expect(lineFor(journal, '5010')).toBeUndefined();
    expect(lineFor(journal, '1032')?.amountMinor).toBe(BASE.grossAmountMinor);
    expect(journal.lines).toHaveLength(2);
  });

  it('carries the product dimension onto every line, for product P&L', () => {
    const journal = paymentReceivedJournal(BASE);

    for (const line of journal.lines) {
      expect(line.productId).toBe('hostelhub');
    }
  });

  it('points back at the transaction that caused it', () => {
    const journal = paymentReceivedJournal(BASE);

    expect(journal.source).toBe('payment');
    expect(journal.sourceTable).toBe('transactions');
    expect(journal.sourceId).toBe('7');
  });

  it('uses the confirmation date, not now()', () => {
    expect(paymentReceivedJournal(BASE).occurredAt).toBe(BASE.occurredAt);
  });

  describe('refusals', () => {
    it('refuses a zero or negative payment', () => {
      expect(() =>
        paymentReceivedJournal({ ...BASE, grossAmountMinor: 0n }),
      ).toThrow(AccountingError);
    });

    it('refuses a negative fee', () => {
      expect(() =>
        paymentReceivedJournal({ ...BASE, providerFeeMinor: -1n }),
      ).toThrow(AccountingError);
    });

    /**
     * A fee that swallows the payment is a mismatch for a human, not an entry
     * to reshape until it balances.
     */
    it('refuses a fee that is not less than the gross', () => {
      expect(() =>
        paymentReceivedJournal({
          ...BASE,
          providerFeeMinor: BASE.grossAmountMinor,
        }),
      ).toThrow(AccountingError);
    });
  });
});
