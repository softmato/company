/**
 * Every report the admin shows, loaded one way, so the screen and the CSV
 * export cannot disagree about a figure.
 */
import 'server-only';
import { db, products, type CredentialMode } from '@softmato/db';

import { receivablesAging } from './aging';
import {
  balanceSheet,
  profitAndLoss,
  trialBalance,
  type ProfitAndLoss,
} from './statements-math';
import { accountTotals, productAccountTotals } from './totals';

export async function loadTrialBalance(
  fiscalYear: string,
  mode: CredentialMode,
) {
  return trialBalance(await accountTotals({ fiscalYear, mode }));
}

export async function loadProfitAndLoss(
  fiscalYear: string,
  mode: CredentialMode,
) {
  return profitAndLoss(await accountTotals({ fiscalYear, mode }));
}

export async function loadBalanceSheet(
  fiscalYear: string,
  mode: CredentialMode,
) {
  return balanceSheet(
    await accountTotals({ fiscalYear, mode, cumulative: true }),
  );
}

export async function loadProductPl(
  fiscalYear: string,
  mode: CredentialMode,
): Promise<{
  columns: { label: string; pl: ProfitAndLoss }[];
  company: ProfitAndLoss;
}> {
  const [split, company, names] = await Promise.all([
    productAccountTotals(fiscalYear, mode),
    loadProfitAndLoss(fiscalYear, mode),
    db.select({ id: products.id, name: products.name }).from(products),
  ]);

  const columns = split
    .map(({ productId, totals }) => ({
      label:
        productId === null
          ? 'No product'
          : (names.find((n) => n.id === productId)?.name ?? productId),
      pl: profitAndLoss(totals),
      unattributed: productId === null,
    }))
    // Named products first, alphabetically; unattributed lines last.
    .sort(
      (a, b) =>
        Number(a.unattributed) - Number(b.unattributed) ||
        a.label.localeCompare(b.label),
    )
    .map(({ label, pl }) => ({ label, pl }));

  return { columns, company };
}

export { receivablesAging };
