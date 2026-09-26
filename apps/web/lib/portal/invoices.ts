/**
 * A client's invoices and the payments against them — read only.
 *
 * Scoped by the viewer's `customerId` (the `customers` row created with the
 * client). Only live (Production) invoices that have been issued: a Sandbox invoice
 * is a test, and a draft is not yet a bill.
 *
 * The portal takes no payment itself. Where the invoice already has an open
 * checkout session, it links to it; the checkout surface does the rest.
 */
import 'server-only';
import { and, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm';

import {
  db,
  invoices,
  paymentProviders,
  paymentSessions,
  transactions,
} from '@softmato/db';

import { env } from '@/lib/env';

export interface ClientReceipt {
  txnNo: string;
  amountMinor: bigint;
  providerName: string;
  paidAt: Date | null;
}

export interface ClientInvoice {
  id: number;
  invoiceNo: string;
  status: string;
  totalMinor: bigint;
  paidMinor: bigint;
  issuedAt: Date | null;
  dueAt: Date | null;
  /** An open checkout session for it, if one exists. */
  payUrl: string | null;
  receipts: ClientReceipt[];
}

const RECEIPTED = ['succeeded', 'refunded', 'partially_refunded'] as const;
const OPEN_SESSION = ['created', 'provider_selected', 'pending'] as const;

function visibleTo(customerId: number) {
  return and(
    eq(invoices.customerId, customerId),
    eq(invoices.mode, 'live'),
    ne(invoices.status, 'draft'),
  );
}

export async function clientInvoices(
  customerId: number,
): Promise<ClientInvoice[]> {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      status: invoices.status,
      totalMinor: invoices.totalMinor,
      paidMinor: invoices.paidMinor,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
    })
    .from(invoices)
    .where(visibleTo(customerId))
    .orderBy(sql`${invoices.issuedAt} DESC NULLS LAST`, desc(invoices.id));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const [sessions, payments] = await Promise.all([
    db
      .select({ id: paymentSessions.id, invoiceId: paymentSessions.invoiceId })
      .from(paymentSessions)
      .where(
        and(
          inArray(paymentSessions.invoiceId, ids),
          inArray(paymentSessions.status, [...OPEN_SESSION]),
          gt(paymentSessions.expiresAt, new Date()),
        ),
      ),
    db
      .select({
        invoiceId: transactions.invoiceId,
        txnNo: transactions.txnNo,
        amountMinor: transactions.grossAmountMinor,
        providerName: paymentProviders.displayName,
        paidAt: transactions.succeededAt,
      })
      .from(transactions)
      .innerJoin(
        paymentProviders,
        eq(paymentProviders.id, transactions.providerId),
      )
      .where(
        and(
          inArray(transactions.invoiceId, ids),
          inArray(transactions.status, [...RECEIPTED]),
        ),
      )
      .orderBy(transactions.createdAt),
  ]);

  const checkoutBase = env.NEXT_PUBLIC_CHECKOUT_URL.replace(/\/$/, '');

  return rows.map((row) => {
    const session = sessions.find((s) => s.invoiceId === row.id);
    const settled = row.status === 'paid' || row.status === 'void';

    return {
      ...row,
      payUrl:
        session && !settled ? `${checkoutBase}/checkout/${session.id}` : null,
      receipts: payments
        .filter((p) => p.invoiceId === row.id)
        .map((p) => ({
          txnNo: p.txnNo,
          amountMinor: p.amountMinor,
          providerName: p.providerName,
          paidAt: p.paidAt,
        })),
    };
  });
}

export async function clientOwnsInvoice(
  customerId: number,
  invoiceNo: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(visibleTo(customerId), eq(invoices.invoiceNo, invoiceNo)))
    .limit(1);

  return Boolean(row);
}

export async function clientOwnsReceipt(
  customerId: number,
  txnNo: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .where(
      and(
        visibleTo(customerId),
        eq(transactions.txnNo, txnNo),
        inArray(transactions.status, [...RECEIPTED]),
      ),
    )
    .limit(1);

  return Boolean(row);
}
