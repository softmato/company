/**
 * Cash — money taken outside every gateway, booked on two people's word.
 *
 * No gateway vouches for cash, so nobody's single say-so books it:
 *
 *   1. **File** (`recordOfflinePayment`). The integrator's staff — a field
 *      agent — report what they took, over the API, with the
 *      `offline_payment:record` scope (off by default). This writes a `cash`
 *      transaction at `pending`: a claim. No journal, no receipt, and the
 *      invoice still shows the money as owed.
 *   2. **Confirm or reject** (`confirmOfflinePayment` / `rejectOfflinePayment`).
 *      A Softmato admin, signed in with MFA, checks it against the money
 *      actually handed over or deposited. Confirming settles it through the
 *      same `settleTransaction` every gateway uses — journal to Cash in Hand,
 *      invoice cleared, receipt emailed, `payment.success` to the integrator —
 *      so a cash receipt is the same document as any other. Rejecting closes
 *      it with the admin's reason and sends `payment.failed`.
 *
 * The database holds the rule too: a `cash` transaction cannot reach
 * `succeeded` without `approved_by` (`cash_needs_second_person`).
 *
 * The customer never sees any of this. It is not on the checkout page, and a
 * checkout can never offer `cash` — the provider row is inactive and has no
 * adapter.
 */
import { and, eq, sql } from 'drizzle-orm';

import { allocateDocumentNo, resolveFiscalPeriod } from '@softmato/accounting';
import {
  invoices,
  transactions,
  type DbTx,
  type Transaction,
} from '@softmato/db';

import type { AuthenticatedApplication } from '../applications/authenticate';
import type { AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import type { ReceiptSender } from '../receipts/receipt';
import {
  settleTransaction,
  type SettlementOutcome,
} from '../transactions/settle';
import { transitionTransaction } from '../transactions/transition';
import { enqueueWebhook } from '../webhooks/enqueue';

export const CASH_PROVIDER = 'cash';

export interface RecordOfflinePaymentInput {
  /** Our invoice number, `INV-2083/84-000010`. */
  invoiceNo: string;
  amountMinor: bigint;
  /** The staff member who took the money — who answers for it until it is banked. */
  collectedBy: string;
  collectedAt?: Date;
  /** A slip number, if one was written. */
  reference?: string;
  note?: string;
}

export interface RecordedOfflinePayment {
  txnNo: string;
  invoiceNo: string;
  amountMinor: bigint;
  currency: string;
  status: Transaction['status'];
  collectedBy: string;
  collectedAt: Date;
}

export async function recordOfflinePayment(
  tx: DbTx,
  application: AuthenticatedApplication,
  input: RecordOfflinePaymentInput,
  audit: AuditRecorder,
  now = new Date(),
): Promise<RecordedOfflinePayment> {
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.invoiceNo, input.invoiceNo),
        eq(invoices.applicationId, application.id),
      ),
    )
    .for('update')
    .limit(1);

  // Another integrator's invoice and one that does not exist answer alike.
  if (!invoice) {
    throw new PaymentError('RESOURCE_NOT_FOUND', 'No such invoice.', {
      invoice_id: input.invoiceNo,
    });
  }

  if (invoice.status !== 'issued' && invoice.status !== 'partially_paid') {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Cash filed against a ${invoice.status} invoice`,
      { invoice_id: invoice.invoiceNo, status: invoice.status },
      `${invoice.invoiceNo} is ${invoice.status.toUpperCase()}; there is nothing to pay against it.`,
    );
  }

  /*
   * Claims already waiting count against what is owed, so the same cash filed
   * twice — a retried request with a fresh key, a double tap — is refused
   * rather than confirmed twice by a busy admin.
   */
  const [waiting] = await tx
    .select({
      total: sql<string>`coalesce(sum(${transactions.grossAmountMinor}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.invoiceId, invoice.id),
        eq(transactions.providerId, CASH_PROVIDER),
        eq(transactions.status, 'pending'),
      ),
    );

  const owed =
    invoice.totalMinor - invoice.paidMinor - BigInt(waiting?.total ?? 0);

  if (input.amountMinor > owed) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'Cash filed for more than is owed',
      { invoice_id: invoice.invoiceNo, owed_minor: owed.toString() },
      `Only ${owed} paisa is still owed on ${invoice.invoiceNo}, counting cash already waiting for confirmation.`,
    );
  }

  const collectedAt = input.collectedAt ?? now;
  const period = await resolveFiscalPeriod(tx, now);
  const { documentNo } = await allocateDocumentNo(tx, 'TXN', period.fiscalYear);

  const [transaction] = await tx
    .insert(transactions)
    .values({
      txnNo: documentNo,
      invoiceId: invoice.id,
      applicationId: application.id,
      credentialId: application.credentialId,
      mode: invoice.mode,
      productId: invoice.productId,
      customerId: invoice.customerId,
      providerId: CASH_PROVIDER,
      status: 'pending',
      grossAmountMinor: input.amountMinor,
      providerFeeMinor: 0n,
      netAmountMinor: input.amountMinor,
      currency: invoice.currency,
      metadata: {
        offline: {
          collectedBy: input.collectedBy,
          collectedAt: collectedAt.toISOString(),
          reference: input.reference ?? null,
          note: input.note ?? null,
        },
      },
    })
    .returning();

  if (!transaction) {
    throw new PaymentError(
      'INTERNAL',
      'Cash transaction insert returned no row',
      {
        invoice_id: invoice.invoiceNo,
      },
    );
  }

  await audit(
    {
      actorType: 'application',
      actorId: String(application.id),
      action: 'transaction.cash_filed',
      resourceType: 'transaction',
      resourceId: transaction.txnNo,
      afterState: {
        invoiceNo: invoice.invoiceNo,
        amountMinor: input.amountMinor.toString(),
        collectedBy: input.collectedBy,
        reference: input.reference ?? null,
      },
    },
    tx,
  );

  return {
    txnNo: transaction.txnNo,
    invoiceNo: invoice.invoiceNo,
    amountMinor: transaction.grossAmountMinor,
    currency: transaction.currency,
    status: transaction.status,
    collectedBy: input.collectedBy,
    collectedAt,
  };
}

async function pendingCash(tx: DbTx, txnNo: string): Promise<Transaction> {
  const [transaction] = await tx
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.txnNo, txnNo),
        eq(transactions.providerId, CASH_PROVIDER),
      ),
    )
    .for('update')
    .limit(1);

  if (!transaction) {
    throw new PaymentError('RESOURCE_NOT_FOUND', 'No such cash payment.', {
      txnNo,
    });
  }

  if (transaction.status !== 'pending') {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Cash payment is ${transaction.status}`,
      { txnNo, status: transaction.status },
      `${txnNo} has already been ${transaction.status === 'succeeded' ? 'confirmed' : 'closed'}.`,
    );
  }

  return transaction;
}

/** The second person's yes. Books it exactly as a gateway payment is booked. */
export async function confirmOfflinePayment(
  tx: DbTx,
  txnNo: string,
  adminId: number,
  audit: AuditRecorder,
  sendReceipt: ReceiptSender,
  now = new Date(),
): Promise<SettlementOutcome> {
  const pending = await pendingCash(tx, txnNo);

  const [approved] = await tx
    .update(transactions)
    .set({ approvedBy: adminId, approvedAt: now, updatedAt: now })
    .where(eq(transactions.id, pending.id))
    .returning();

  await audit(
    {
      actorType: 'admin',
      actorId: String(adminId),
      action: 'transaction.cash_confirmed',
      resourceType: 'transaction',
      resourceId: txnNo,
      afterState: { amountMinor: pending.grossAmountMinor.toString() },
    },
    tx,
  );

  return settleTransaction(
    tx,
    approved ?? pending,
    {
      status: 'succeeded',
      grossAmountMinor: pending.grossAmountMinor,
      providerFeeMinor: 0n,
      providerTxnId: txnNo,
      raw: { confirmedBy: adminId, confirmedAt: now.toISOString() },
    },
    audit,
    sendReceipt,
    now,
  );
}

/** The second person's no: closed with their reason, and the integrator told. */
export async function rejectOfflinePayment(
  tx: DbTx,
  txnNo: string,
  adminId: number,
  reason: string,
  audit: AuditRecorder,
  now = new Date(),
): Promise<Transaction> {
  const pending = await pendingCash(tx, txnNo);
  const moved = await transitionTransaction(
    tx,
    pending,
    'failed',
    { failureReason: `Cash rejected: ${reason}` },
    now,
  );

  await audit(
    {
      actorType: 'admin',
      actorId: String(adminId),
      action: 'transaction.cash_rejected',
      resourceType: 'transaction',
      resourceId: txnNo,
      afterState: { reason },
    },
    tx,
  );

  const [invoice] = await tx
    .select({ invoiceNo: invoices.invoiceNo })
    .from(invoices)
    .where(eq(invoices.id, moved.invoiceId))
    .limit(1);

  if (invoice)
    await enqueueWebhook(tx, moved, 'payment.failed', invoice.invoiceNo, now);

  return moved;
}
