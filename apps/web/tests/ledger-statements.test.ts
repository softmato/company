/**
 * Phase 7 acceptance 1 and 4 in arithmetic: the P&L and balance sheet tie to
 * the trial balance to the paisa, and product P&Ls add up to the company's.
 */
import { describe, expect, test } from 'vitest';

import {
  balanceSheet,
  profitAndLoss,
  trialBalance,
  type AccountTotals,
} from '@/lib/ledger/statements-math';

const row = (
  code: string,
  cls: AccountTotals['class'],
  debit: bigint,
  credit: bigint,
): AccountTotals => ({
  code,
  name: code,
  class: cls,
  debitMinor: debit,
  creditMinor: credit,
});

/*
 * A small balanced year: an NPR 12,000 invoice (partly deferred), a payment
 * with a 240 fee, a 3,000 refund, 1,000 of hosting and 500 of rent.
 */
const year: AccountTotals[] = [
  row('1020', 'asset', 1_176_000n, 300_000n + 100_000n + 50_000n), // bank
  row('1110', 'asset', 1_200_000n, 1_200_000n), // receivable, settled
  row('2110', 'liability', 0n, 1_100_000n), // deferred revenue
  row('4010', 'revenue', 0n, 100_000n), // recognised
  row('4900', 'revenue', 300_000n, 0n), // refund (contra-revenue)
  row('5010', 'direct_cost', 24_000n, 0n), // provider fee
  row('5020', 'direct_cost', 100_000n, 0n),
  row('6030', 'expense', 50_000n, 0n),
  row('3010', 'equity', 0n, 0n),
];

describe('statements', () => {
  test('the trial balance balances', () => {
    const tb = trialBalance(year);
    expect(tb.debitTotal).toBe(tb.creditTotal);
    expect(tb.lines.map((l) => l.code)).not.toContain('3010'); // untouched accounts are left out
  });

  test('a contra-revenue account reduces revenue', () => {
    const pl = profitAndLoss(year);
    expect(pl.revenueTotal).toBe(100_000n - 300_000n);
    expect(pl.grossProfit).toBe(pl.revenueTotal - 124_000n);
    expect(pl.netProfit).toBe(pl.grossProfit - 50_000n);
  });

  test('the balance sheet ties to the trial balance', () => {
    const bs = balanceSheet(year);
    expect(bs.differenceMinor).toBe(0n);
    expect(bs.unclosedEarnings).toBe(profitAndLoss(year).netProfit);
  });

  test('product P&Ls add up to the company P&L', () => {
    const hostel = [
      row('4010', 'revenue', 0n, 80_000n),
      row('5010', 'direct_cost', 20_000n, 0n),
    ];
    const agency = [
      row('4020', 'revenue', 0n, 50_000n),
      row('5010', 'direct_cost', 4_000n, 0n),
    ];
    const overhead = [row('6030', 'expense', 50_000n, 0n)];
    const company = profitAndLoss([...hostel, ...agency, ...overhead]);

    const parts = [hostel, agency, overhead].map(
      (p) => profitAndLoss(p).netProfit,
    );
    expect(parts.reduce((n, p) => n + p, 0n)).toBe(company.netProfit);
  });
});
