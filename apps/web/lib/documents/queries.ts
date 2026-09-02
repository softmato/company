import 'server-only';

import { and, asc, eq, type SQL } from 'drizzle-orm';

import {
  customers,
  db,
  invoiceLines,
  invoices,
  journalEntries,
  paymentProviders,
  products,
  transactions,
} from '@softmato/db';

/**
 * The reads the invoice and receipt documents are built from.
 *
 * Separate from `lib/admin/invoices-queries.ts` on purpose: that one answers
 * "what is on the list screen", which is a summary over many rows. This
 * answers "what does this one document say", which needs the lines, both
 * parties and the payment history — and needs *all* of it, because a document
 * with a missing line is not a shorter document, it is a wrong one.
 *
 * **`ownerApplicationId` is an authorization boundary, not a filter.** The
 * admin panel passes nothing and sees every invoice; the `/v1` API passes the
 * authenticated application's id, and an invoice belonging to a different SaaS
 * then comes back as `null` — indistinguishable from one that does not exist,
 * which is the right answer to give a caller with no business knowing either
 * way. Enforcing it in the `WHERE` clause rather than after the read means a
 * handler cannot forget to check.
 */

export interface InvoiceRecord {
  id: number;
  invoiceNo: string;
  fiscalYear: string;
  status: string;
  externalRef: string | null;
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  paidMinor: bigint;
  currency: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  serviceStartsAt: Date | null;
  serviceEndsAt: Date | null;
  metadata: Record<string, unknown>;
  productName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerPan: string | null;
  customerAddress: string | null;
}

export interface InvoiceLineRecord {
  lineNo: number;
  description: string;
  quantity: string;
  unitPriceMinor: bigint;
  amountMinor: bigint;
}

export interface PaymentRecord {
  txnNo: string;
  status: string;
  grossAmountMinor: bigint;
  currency: string;
  providerId: string;
  providerName: string;
  providerRef: string | null;
  providerTxnId: string | null;
  succeededAt: Date | null;
  createdAt: Date;
  journalNo: string | null;
}

/**
 * One invoice with its customer and product.
 *
 * `null` when there is no such row **or** when it belongs to someone else —
 * see the note above.
 */
export async function findInvoice(
  invoiceNo: string,
  ownerApplicationId?: number,
): Promise<InvoiceRecord | null> {
  const [row] = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      fiscalYear: invoices.fiscalYear,
      status: invoices.status,
      externalRef: invoices.externalRef,
      subtotalMinor: invoices.subtotalMinor,
      discountMinor: invoices.discountMinor,
      taxMinor: invoices.taxMinor,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
      currency: invoices.currency,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      serviceStartsAt: invoices.serviceStartsAt,
      serviceEndsAt: invoices.serviceEndsAt,
      metadata: invoices.metadata,
      productName: products.name,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerPan: customers.pan,
      customerAddress: customers.address,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(products, eq(products.id, invoices.productId))
    .where(
      owned(
        eq(invoices.invoiceNo, invoiceNo),
        invoices.applicationId,
        ownerApplicationId,
      ),
    )
    .limit(1);

  return row ?? null;
}

/** Ordered by `line_no', which is the order they were invoiced in. */
export async function invoiceLinesFor(
  invoiceId: number,
): Promise<InvoiceLineRecord[]> {
  return db
    .select({
      lineNo: invoiceLines.lineNo,
      description: invoiceLines.description,
      quantity: invoiceLines.quantity,
      unitPriceMinor: invoiceLines.unitPriceMinor,
      amountMinor: invoiceLines.amountMinor,
    })
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId))
    .orderBy(asc(invoiceLines.lineNo));
}

/**
 * Every payment attempt against an invoice, newest last.
 *
 * **Not only the successful ones.** The invoice detail screen shows the whole
 * history, because "the customer tried three times and the gateway declined
 * twice" is the answer to the support question that brought someone to the
 * page. The *receipt* is built from a single succeeded row; the filtering
 * happens there, not here.
 */
export async function paymentsFor(invoiceId: number): Promise<PaymentRecord[]> {
  return db
    .select({
      txnNo: transactions.txnNo,
      status: transactions.status,
      grossAmountMinor: transactions.grossAmountMinor,
      currency: transactions.currency,
      providerId: transactions.providerId,
      providerName: paymentProviders.displayName,
      providerRef: transactions.providerRef,
      providerTxnId: transactions.providerTxnId,
      succeededAt: transactions.succeededAt,
      createdAt: transactions.createdAt,
      journalNo: journalEntries.journalNo,
    })
    .from(transactions)
    .innerJoin(
      paymentProviders,
      eq(paymentProviders.id, transactions.providerId),
    )
    .leftJoin(journalEntries, eq(journalEntries.id, transactions.journalId))
    .where(eq(transactions.invoiceId, invoiceId))
    .orderBy(asc(transactions.createdAt));
}

/** One transaction by its number, with the invoice it settled. */
export async function findPayment(
  txnNo: string,
  ownerApplicationId?: number,
): Promise<(PaymentRecord & { invoiceId: number; invoiceNo: string }) | null> {
  const [row] = await db
    .select({
      txnNo: transactions.txnNo,
      status: transactions.status,
      grossAmountMinor: transactions.grossAmountMinor,
      currency: transactions.currency,
      providerId: transactions.providerId,
      providerName: paymentProviders.displayName,
      providerRef: transactions.providerRef,
      providerTxnId: transactions.providerTxnId,
      succeededAt: transactions.succeededAt,
      createdAt: transactions.createdAt,
      journalNo: journalEntries.journalNo,
      invoiceId: transactions.invoiceId,
      invoiceNo: invoices.invoiceNo,
    })
    .from(transactions)
    .innerJoin(
      paymentProviders,
      eq(paymentProviders.id, transactions.providerId),
    )
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .leftJoin(journalEntries, eq(journalEntries.id, transactions.journalId))
    .where(
      owned(
        eq(transactions.txnNo, txnNo),
        transactions.applicationId,
        ownerApplicationId,
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Adds the ownership clause when there is an owner to enforce.
 *
 * Written as a helper so the two call sites read the same and neither can
 * accidentally drop it while being edited for something else.
 */
function owned(
  base: SQL,
  column: Parameters<typeof eq>[0],
  ownerApplicationId: number | undefined,
): SQL {
  if (ownerApplicationId === undefined) return base;

  return and(base, eq(column, ownerApplicationId)) as SQL;
}
