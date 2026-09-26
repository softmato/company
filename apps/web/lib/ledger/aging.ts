/**
 * Accounts receivable aging: what customers owe, by how late it is.
 *
 * Read from invoices rather than account 1110, because the question is "who
 * owes what" and the ledger answers only "how much in total". The two should
 * agree; reconciliation is where they are made to.
 */
import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';

import {
  customers,
  db,
  invoices,
  products,
  type CredentialMode,
} from '@softmato/db';

export const AGING_BUCKETS = [
  'Not yet due',
  '1–30 days',
  '31–60 days',
  '61–90 days',
  'Over 90 days',
] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

/** Pure: which bucket a due date falls in on a given day. */
export function agingBucket(dueAt: Date | null, now: Date): AgingBucket {
  if (!dueAt || dueAt >= now) return 'Not yet due';
  const days = Math.floor((now.getTime() - dueAt.getTime()) / 86_400_000);
  if (days <= 30) return '1–30 days';
  if (days <= 60) return '31–60 days';
  if (days <= 90) return '61–90 days';
  return 'Over 90 days';
}

export interface AgingRow {
  invoiceNo: string;
  customerName: string;
  productName: string;
  dueAt: Date | null;
  balanceMinor: bigint;
  bucket: AgingBucket;
}

export async function receivablesAging(
  mode: CredentialMode,
  now = new Date(),
): Promise<{ rows: AgingRow[]; totals: Record<AgingBucket, bigint> }> {
  const open = await db
    .select({
      invoiceNo: invoices.invoiceNo,
      customerName: customers.name,
      productName: products.name,
      dueAt: invoices.dueAt,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
      tdsMinor: invoices.tdsWithheldMinor,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(products, eq(products.id, invoices.productId))
    .where(
      and(
        eq(invoices.mode, mode),
        inArray(invoices.status, ['issued', 'partially_paid']),
      ),
    )
    .orderBy(asc(invoices.dueAt));

  const totals = Object.fromEntries(
    AGING_BUCKETS.map((b) => [b, 0n]),
  ) as Record<AgingBucket, bigint>;

  const rows = open
    .map((i) => {
      const balanceMinor = i.totalMinor - i.paidMinor - i.tdsMinor;
      const bucket = agingBucket(i.dueAt, now);
      return {
        invoiceNo: i.invoiceNo,
        customerName: i.customerName,
        productName: i.productName,
        dueAt: i.dueAt,
        balanceMinor,
        bucket,
      };
    })
    .filter((r) => r.balanceMinor > 0n);

  for (const r of rows) totals[r.bucket] += r.balanceMinor;

  return { rows, totals };
}
