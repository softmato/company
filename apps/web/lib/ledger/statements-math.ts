/**
 * Financial statements from per-account totals. Pure — the arithmetic is
 * what the tests pin, so a report can only be wrong in its query.
 *
 * **Signs come from the account's class, not its normal balance.** Revenue is
 * credit-positive, so a contra-revenue account (4900 Refunds) comes out
 * negative and reduces revenue without a special case; an accumulated
 * depreciation account under assets does the same. Every figure is paisa as
 * `bigint` (docs/RULES.md §2.1).
 */
export type AccountClass =
  'asset' | 'liability' | 'equity' | 'revenue' | 'direct_cost' | 'expense';

export interface AccountTotals {
  code: string;
  name: string;
  class: AccountClass;
  debitMinor: bigint;
  creditMinor: bigint;
}

export interface StatementLine {
  code: string;
  name: string;
  amountMinor: bigint;
}

const DEBIT_POSITIVE = new Set<AccountClass>([
  'asset',
  'direct_cost',
  'expense',
]);

export function naturalBalance(a: AccountTotals): bigint {
  return DEBIT_POSITIVE.has(a.class)
    ? a.debitMinor - a.creditMinor
    : a.creditMinor - a.debitMinor;
}

function section(
  rows: AccountTotals[],
  cls: AccountClass,
): { lines: StatementLine[]; total: bigint } {
  const lines = rows
    .filter((r) => r.class === cls)
    .map((r) => ({
      code: r.code,
      name: r.name,
      amountMinor: naturalBalance(r),
    }))
    .filter((l) => l.amountMinor !== 0n)
    .sort((a, b) => a.code.localeCompare(b.code));

  return { lines, total: lines.reduce((n, l) => n + l.amountMinor, 0n) };
}

export interface ProfitAndLoss {
  revenue: StatementLine[];
  revenueTotal: bigint;
  directCosts: StatementLine[];
  directCostTotal: bigint;
  grossProfit: bigint;
  expenses: StatementLine[];
  expenseTotal: bigint;
  netProfit: bigint;
}

export function profitAndLoss(rows: AccountTotals[]): ProfitAndLoss {
  const revenue = section(rows, 'revenue');
  const direct = section(rows, 'direct_cost');
  const expense = section(rows, 'expense');
  const grossProfit = revenue.total - direct.total;

  return {
    revenue: revenue.lines,
    revenueTotal: revenue.total,
    directCosts: direct.lines,
    directCostTotal: direct.total,
    grossProfit,
    expenses: expense.lines,
    expenseTotal: expense.total,
    netProfit: grossProfit - expense.total,
  };
}

export interface BalanceSheet {
  assets: StatementLine[];
  assetTotal: bigint;
  liabilities: StatementLine[];
  liabilityTotal: bigint;
  equity: StatementLine[];
  equityTotal: bigint;
  /** Profit not yet closed into retained earnings, all years to date. */
  unclosedEarnings: bigint;
  /** Assets − (liabilities + equity + unclosed earnings). Zero, always. */
  differenceMinor: bigint;
}

/** From cumulative totals: everything posted up to the statement date. */
export function balanceSheet(cumulative: AccountTotals[]): BalanceSheet {
  const assets = section(cumulative, 'asset');
  const liabilities = section(cumulative, 'liability');
  const equity = section(cumulative, 'equity');
  const unclosedEarnings = profitAndLoss(cumulative).netProfit;

  return {
    assets: assets.lines,
    assetTotal: assets.total,
    liabilities: liabilities.lines,
    liabilityTotal: liabilities.total,
    equity: equity.lines,
    equityTotal: equity.total,
    unclosedEarnings,
    differenceMinor:
      assets.total - (liabilities.total + equity.total + unclosedEarnings),
  };
}

export interface TrialBalanceLine extends AccountTotals {
  balanceMinor: bigint;
}

export interface TrialBalance {
  lines: TrialBalanceLine[];
  debitTotal: bigint;
  creditTotal: bigint;
}

export function trialBalance(rows: AccountTotals[]): TrialBalance {
  const lines = rows
    .filter((r) => r.debitMinor !== 0n || r.creditMinor !== 0n)
    .map((r) => ({ ...r, balanceMinor: naturalBalance(r) }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    lines,
    debitTotal: lines.reduce((n, l) => n + l.debitMinor, 0n),
    creditTotal: lines.reduce((n, l) => n + l.creditMinor, 0n),
  };
}
