/**
 * Which revenue account a line earns into.
 *
 * `POST /v1/invoices` in docs/API.md §3 has no revenue-account field, but
 * `invoice_lines.revenue_account` is NOT NULL — so someone has to decide, and
 * a line description is not enough to tell "Software Development Revenue"
 * from "Setup / Onboarding Fees".
 *
 * The resolution: a caller may name an account, and the default comes from the
 * product's kind. Whatever arrives is checked against the chart of accounts
 * itself — it must exist, be a revenue account, be postable, and not be one of
 * the contra-revenue accounts. A SaaS cannot post its revenue into a
 * receivable, a liability, or 4900.
 */
import { and, eq, inArray } from 'drizzle-orm';

import { accounts, type DbTx } from '@softmato/db';
import { DEFAULT_REVENUE_BY_KIND, isInvoiceableKind } from '@softmato/accounting';

import { PaymentError } from '../errors';

export function defaultRevenueAccount(productKind: string): string {
  if (!isInvoiceableKind(productKind)) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Product kind ${productKind} is not something a customer is invoiced for`,
      { productKind },
    );
  }

  return DEFAULT_REVENUE_BY_KIND[productKind];
}

/**
 * Rejects the whole invoice if any requested account is unusable. Partial
 * acceptance would leave a caller with an invoice they did not ask for.
 */
export async function assertRevenueAccounts(
  tx: DbTx,
  codes: string[],
): Promise<void> {
  const wanted = [...new Set(codes)];
  if (wanted.length === 0) return;

  const rows = await tx
    .select({ code: accounts.code, isContra: accounts.isContra })
    .from(accounts)
    .where(
      and(
        inArray(accounts.code, wanted),
        eq(accounts.class, 'revenue'),
        eq(accounts.isPostable, true),
        eq(accounts.isActive, true),
      ),
    );

  const usable = new Set(
    rows.filter((row) => !row.isContra).map((row) => row.code),
  );

  const rejected = wanted.filter((code) => !usable.has(code));

  if (rejected.length > 0) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'One or more revenue accounts are not postable revenue accounts',
      { rejected },
    );
  }
}
