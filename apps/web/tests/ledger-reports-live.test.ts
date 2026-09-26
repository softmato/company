/**
 * Phase 7 acceptance 1 and 4 against whatever the database actually holds:
 * for every real fiscal year, in both Production and Sandbox books, the trial
 * balance balances, the balance sheet ties to it, and the product columns add
 * up to the company P&L.
 *
 * Also exercises every report query for real, so a SQL mistake in the mode
 * resolution or the year filters fails here rather than on an admin screen
 * nobody can open without an authenticator.
 */
import { describe, expect, test } from 'vitest';

import { accountLedger, chartOfAccounts } from '@/lib/ledger/accounts';
import { listJournals, journalDetail } from '@/lib/ledger/journals';
import { periodsOf } from '@/lib/ledger/periods';
import {
  loadBalanceSheet,
  loadProductPl,
  loadProfitAndLoss,
  loadTrialBalance,
  receivablesAging,
} from '@/lib/ledger/reports';
import { fiscalYears } from '@/lib/ledger/scope';

describe('ledger reports tie out', () => {
  test('in every fiscal year and both modes', async () => {
    const years = await fiscalYears();

    for (const fy of years) {
      for (const mode of ['live', 'test'] as const) {
        const tb = await loadTrialBalance(fy, mode);
        expect(tb.debitTotal, `${fy} ${mode} trial balance`).toBe(
          tb.creditTotal,
        );

        const bs = await loadBalanceSheet(fy, mode);
        expect(bs.differenceMinor, `${fy} ${mode} balance sheet`).toBe(0n);

        const { columns, company } = await loadProductPl(fy, mode);
        const pl = await loadProfitAndLoss(fy, mode);
        expect(company.netProfit).toBe(pl.netProfit);
        expect(
          columns.reduce((n, c) => n + c.pl.netProfit, 0n),
          `${fy} ${mode} product P&L`,
        ).toBe(company.netProfit);
      }
    }
  }, 120_000);

  test('the browser and ledger queries run', async () => {
    const [fy] = await fiscalYears();
    if (!fy) return;

    const chart = await chartOfAccounts(fy, 'live');
    expect(chart.length).toBeGreaterThan(0);

    const ledger = await accountLedger(chart[0]!.code, fy, 'live');
    expect(ledger?.account.code).toBe(chart[0]!.code);

    const { rows } = await listJournals({
      fiscalYear: fy,
      mode: 'test',
      page: 1,
    });
    if (rows[0]) {
      const detail = await journalDetail(rows[0].journalNo);
      expect(detail?.mode).toBe('test');
      const debit = detail!.lines
        .filter((l) => l.direction === 'debit')
        .reduce((n, l) => n + l.amountMinor, 0n);
      expect(debit).toBe(rows[0].amountMinor);
    }

    expect((await periodsOf(fy, 'live')).length).toBeGreaterThan(0);
    await receivablesAging('live');
  }, 60_000);
});
