/**
 * The reconciliation queue's read model.
 *
 * Two distinct things land here and the screen must not blur them:
 *
 *   1. **Transactions held at settlement** — a provider reported an amount
 *      that did not match the invoice, so `completePayment` posted nothing and
 *      flagged the row. These exist today, on the live payment path.
 *   2. **Items from a reconciliation run** — a periodic comparison of our
 *      totals against a provider's statement. `reconcile-providers` is Phase 7
 *      and does not run yet, so this list is empty until it does.
 *
 * The screen shows both and says which is which, rather than presenting an
 * empty queue that could mean either "nothing is wrong" or "nothing has looked
 * yet".
 */
import 'server-only';

import { desc, eq, sql } from 'drizzle-orm';

import {
  customers,
  db,
  invoices,
  reconciliationItems,
  reconciliationRuns,
  transactions,
} from '@softmato/db';

export interface HeldPayment {
  id: number;
  txnNo: string;
  providerId: string;
  providerRef: string | null;
  expectedMinor: bigint;
  currency: string;
  invoiceNo: string;
  customerName: string;
  failureReason: string | null;
  flaggedAt: Date;
}

export interface RunItem {
  id: number;
  runId: number;
  providerId: string;
  providerRef: string | null;
  internalMinor: bigint | null;
  providerMinor: bigint | null;
  status: string;
  note: string | null;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Payments the settlement path refused to book.
 *
 * `expectedMinor` is ours. **What the provider reported is deliberately not a
 * column here**: it is not stored on the transaction — storing it would invite
 * a screen offering "accept the provider's amount", which is precisely the
 * auto-resolution RULES.md §2.8 forbids. The provider's figure lives in
 * `provider_events`, where reading it is a deliberate act.
 */
export async function heldPayments(limit = 100): Promise<HeldPayment[]> {
  return db
    .select({
      id: transactions.id,
      txnNo: transactions.txnNo,
      providerId: transactions.providerId,
      providerRef: transactions.providerRef,
      expectedMinor: transactions.grossAmountMinor,
      currency: transactions.currency,
      invoiceNo: invoices.invoiceNo,
      customerName: customers.name,
      failureReason: transactions.failureReason,
      flaggedAt: transactions.updatedAt,
    })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .innerJoin(customers, eq(customers.id, transactions.customerId))
    .where(eq(transactions.status, 'reconciliation_required'))
    .orderBy(desc(transactions.updatedAt))
    .limit(limit);
}

/** Unresolved items from provider statement runs. Empty until Phase 7. */
export async function openRunItems(limit = 100): Promise<RunItem[]> {
  return db
    .select({
      id: reconciliationItems.id,
      runId: reconciliationItems.runId,
      providerId: reconciliationRuns.providerId,
      providerRef: reconciliationItems.providerRef,
      internalMinor: reconciliationItems.internalMinor,
      providerMinor: reconciliationItems.providerMinor,
      status: reconciliationItems.status,
      note: reconciliationItems.note,
      periodStart: reconciliationRuns.periodStart,
      periodEnd: reconciliationRuns.periodEnd,
    })
    .from(reconciliationItems)
    .innerJoin(
      reconciliationRuns,
      eq(reconciliationRuns.id, reconciliationItems.runId),
    )
    .where(sql`${reconciliationItems.status} IN ('open','mismatched')`)
    .orderBy(desc(reconciliationItems.id))
    .limit(limit);
}

/** Whether any reconciliation run has ever happened. */
export async function hasEverRun(): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(reconciliationRuns);

  return (row?.count ?? 0) > 0;
}
