/**
 * The payments screen's read model.
 *
 * Filtering and searching happen in SQL rather than in the browser. The page
 * this replaces held a hardcoded array and filtered it in React state, which
 * would have meant shipping every transaction ever made to the client in order
 * to narrow it down.
 */
import 'server-only';

import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import {
  customers,
  db,
  invoices,
  journalEntries,
  transactions,
} from '@softmato/db';

export const PAYMENT_STATUSES = [
  'succeeded',
  'pending',
  'reconciliation_required',
  'failed',
  'refunded',
] as const;

export interface PaymentRow {
  id: number;
  txnNo: string;
  providerId: string;
  providerRef: string | null;
  providerTxnId: string | null;
  status: string;
  grossAmountMinor: bigint;
  providerFeeMinor: bigint;
  netAmountMinor: bigint;
  currency: string;
  invoiceNo: string;
  customerName: string;
  journalNo: string | null;
  createdAt: Date;
  succeededAt: Date | null;
}

export interface PaymentTotals {
  /** Gross of settled payments only. Pending money is not money. */
  settledGrossMinor: bigint;
  settledFeeMinor: bigint;
  settledCount: number;
  pendingCount: number;
  flaggedCount: number;
}

interface PaymentFilter {
  status?: string | undefined;
  query?: string | undefined;
  limit?: number;
}

function whereFor(filter: PaymentFilter): SQL | undefined {
  const clauses: SQL[] = [];

  // Anything not in the offered list is ignored rather than passed to the
  // database — the value comes from a query string.
  if (
    filter.status &&
    (PAYMENT_STATUSES as readonly string[]).includes(filter.status)
  ) {
    clauses.push(eq(transactions.status, filter.status as 'succeeded'));
  }

  const query = filter.query?.trim();

  if (query) {
    const like = `%${query}%`;

    clauses.push(
      or(
        ilike(transactions.txnNo, like),
        ilike(transactions.providerRef, like),
        ilike(transactions.providerTxnId, like),
        ilike(invoices.invoiceNo, like),
        ilike(customers.name, like),
      )!,
    );
  }

  return clauses.length ? and(...clauses) : undefined;
}

export async function listPayments(
  filter: PaymentFilter = {},
): Promise<PaymentRow[]> {
  return db
    .select({
      id: transactions.id,
      txnNo: transactions.txnNo,
      providerId: transactions.providerId,
      providerRef: transactions.providerRef,
      providerTxnId: transactions.providerTxnId,
      status: transactions.status,
      grossAmountMinor: transactions.grossAmountMinor,
      providerFeeMinor: transactions.providerFeeMinor,
      netAmountMinor: transactions.netAmountMinor,
      currency: transactions.currency,
      invoiceNo: invoices.invoiceNo,
      customerName: customers.name,
      journalNo: journalEntries.journalNo,
      createdAt: transactions.createdAt,
      succeededAt: transactions.succeededAt,
    })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .innerJoin(customers, eq(customers.id, transactions.customerId))
    // Left: only a settled transaction has a journal, and the others must
    // still appear — a pending payment vanishing from the list because it has
    // not been booked yet is the opposite of useful.
    .leftJoin(journalEntries, eq(journalEntries.id, transactions.journalId))
    .where(whereFor(filter))
    .orderBy(desc(transactions.createdAt))
    .limit(filter.limit ?? 100);
}

/**
 * The header figures.
 *
 * Counted over the whole table, not the filtered page: "3 held for review" has
 * to stay true while you are looking at the succeeded tab, because it is the
 * number that tells you to go and look.
 */
export async function paymentTotals(): Promise<PaymentTotals> {
  const [row] = await db
    .select({
      settledGross: sql<string>`COALESCE(SUM(${transactions.grossAmountMinor}) FILTER (WHERE ${transactions.status} = 'succeeded'), 0)::text`,
      settledFee: sql<string>`COALESCE(SUM(${transactions.providerFeeMinor}) FILTER (WHERE ${transactions.status} = 'succeeded'), 0)::text`,
      settled: sql<number>`COUNT(*) FILTER (WHERE ${transactions.status} = 'succeeded')::int`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${transactions.status} IN ('created','pending'))::int`,
      flagged: sql<number>`COUNT(*) FILTER (WHERE ${transactions.status} = 'reconciliation_required')::int`,
    })
    .from(transactions);

  return {
    // Read back as text and parsed to `bigint`: `SUM` of a bigint column comes
    // back as `numeric`, and routing money through a JS `number` on the way to
    // a screen is how a total quietly stops matching the ledger.
    settledGrossMinor: BigInt(row?.settledGross ?? '0'),
    settledFeeMinor: BigInt(row?.settledFee ?? '0'),
    settledCount: row?.settled ?? 0,
    pendingCount: row?.pending ?? 0,
    flaggedCount: row?.flagged ?? 0,
  };
}
