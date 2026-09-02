/**
 * The invoices screen's read model.
 *
 * `past_due` is computed here rather than stored, because it is a fact about
 * the clock: an invoice issued with a due date does not change row when that
 * date passes. Storing it would need a job to keep it true, and a screen
 * showing "issued" for something three weeks overdue is worse than no screen.
 */
import 'server-only';

import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { customers, db, invoices, products } from '@softmato/db';

export const INVOICE_STATUSES = [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'cancelled',
] as const;

export interface InvoiceRow {
  id: number;
  invoiceNo: string;
  externalRef: string | null;
  customerName: string;
  productName: string;
  status: string;
  totalMinor: bigint;
  paidMinor: bigint;
  currency: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  /** Derived, not stored. See the note at the top of this file. */
  pastDue: boolean;
}

export interface InvoiceTotals {
  outstandingMinor: bigint;
  paidMinor: bigint;
  pastDueCount: number;
  draftCount: number;
}

interface InvoiceFilter {
  status?: string | undefined;
  query?: string | undefined;
  limit?: number;
}

function whereFor(filter: InvoiceFilter): SQL | undefined {
  const clauses: SQL[] = [];

  if (
    filter.status &&
    (INVOICE_STATUSES as readonly string[]).includes(filter.status)
  ) {
    clauses.push(eq(invoices.status, filter.status as 'issued'));
  }

  const query = filter.query?.trim();

  if (query) {
    const like = `%${query}%`;

    clauses.push(
      or(
        ilike(invoices.invoiceNo, like),
        ilike(invoices.externalRef, like),
        ilike(customers.name, like),
      )!,
    );
  }

  return clauses.length ? and(...clauses) : undefined;
}

export async function listInvoices(
  filter: InvoiceFilter = {},
  now = new Date(),
): Promise<InvoiceRow[]> {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      externalRef: invoices.externalRef,
      customerName: customers.name,
      productName: products.name,
      status: invoices.status,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
      currency: invoices.currency,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(products, eq(products.id, invoices.productId))
    .where(whereFor(filter))
    // Numbering is gapless per fiscal year, so newest first is the sequence
    // reversed rather than a date sort that could tie.
    .orderBy(desc(invoices.fiscalYear), desc(invoices.sequenceNo))
    .limit(filter.limit ?? 100);

  return rows.map((row) => ({
    ...row,
    pastDue:
      row.dueAt !== null &&
      row.dueAt < now &&
      row.paidMinor < row.totalMinor &&
      (row.status === 'issued' || row.status === 'partially_paid'),
  }));
}

export async function invoiceTotals(now = new Date()): Promise<InvoiceTotals> {
  const [row] = await db
    .select({
      /*
       * Outstanding is `total - paid` over unsettled invoices, not the sum of
       * their totals: a partially paid invoice owes the remainder, and
       * counting the whole amount would overstate what is owed to us.
       */
      outstanding: sql<string>`COALESCE(SUM(${invoices.totalMinor} - ${invoices.paidMinor}) FILTER (WHERE ${invoices.status} IN ('issued','partially_paid')), 0)::text`,
      paid: sql<string>`COALESCE(SUM(${invoices.paidMinor}), 0)::text`,
      pastDue: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} IN ('issued','partially_paid') AND ${invoices.dueAt} < ${now})::int`,
      draft: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'draft')::int`,
    })
    .from(invoices);

  return {
    outstandingMinor: BigInt(row?.outstanding ?? '0'),
    paidMinor: BigInt(row?.paid ?? '0'),
    pastDueCount: row?.pastDue ?? 0,
    draftCount: row?.draft ?? 0,
  };
}

/**
 * The gap check.
 *
 * Invoice numbers must be gapless within a fiscal year (PHASES.md Phase 6
 * acceptance 5). A hole means a number was allocated and its invoice never
 * committed, which an auditor will ask about — so the screen says so rather
 * than leaving it to be discovered at year end.
 */
export async function numberingGaps(): Promise<
  { fiscalYear: string; expected: number; actual: number }[]
> {
  const rows = await db
    .select({
      fiscalYear: invoices.fiscalYear,
      max: sql<number>`MAX(${invoices.sequenceNo})::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(invoices)
    .groupBy(invoices.fiscalYear)
    .orderBy(asc(invoices.fiscalYear));

  return rows
    .filter((row) => row.max !== row.count)
    .map((row) => ({
      fiscalYear: row.fiscalYear,
      expected: row.max,
      actual: row.count,
    }));
}
