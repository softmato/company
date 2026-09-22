import 'server-only';

import { and, desc, eq, inArray } from 'drizzle-orm';

import {
  customers,
  db,
  invoices,
  transactions,
  type CredentialMode,
} from '@softmato/db';
import { CASH_PROVIDER } from '@softmato/payment-core';

/** Cash filed by an integrator's staff, as the confirming admin needs to see it. */
export interface CashRow {
  txnNo: string;
  invoiceNo: string;
  customerName: string;
  amountMinor: bigint;
  currency: string;
  status: string;
  collectedBy: string;
  collectedAt: string | null;
  reference: string | null;
  note: string | null;
  failureReason: string | null;
  createdAt: Date;
  approvedAt: Date | null;
}

type Offline = {
  collectedBy?: string;
  collectedAt?: string;
  reference?: string | null;
  note?: string | null;
};

export async function listCash(
  mode: CredentialMode,
  statuses: string[],
  limit = 100,
): Promise<CashRow[]> {
  const rows = await db
    .select({
      txnNo: transactions.txnNo,
      invoiceNo: invoices.invoiceNo,
      customerName: customers.name,
      amountMinor: transactions.grossAmountMinor,
      currency: transactions.currency,
      status: transactions.status,
      metadata: transactions.metadata,
      failureReason: transactions.failureReason,
      createdAt: transactions.createdAt,
      approvedAt: transactions.approvedAt,
    })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .innerJoin(customers, eq(customers.id, transactions.customerId))
    .where(
      and(
        eq(transactions.providerId, CASH_PROVIDER),
        eq(transactions.mode, mode),
        inArray(
          transactions.status,
          statuses as (typeof transactions.status.enumValues)[number][],
        ),
      ),
    )
    .orderBy(desc(transactions.createdAt))
    .limit(limit);

  return rows.map(({ metadata, ...row }) => {
    const offline = ((metadata as { offline?: Offline }).offline ??
      {}) as Offline;

    return {
      ...row,
      collectedBy: offline.collectedBy ?? '—',
      collectedAt: offline.collectedAt ?? null,
      reference: offline.reference ?? null,
      note: offline.note ?? null,
    };
  });
}
