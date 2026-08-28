/**
 * A payment is confirmed: the ledger records it, the invoice clears, and the
 * payer gets a receipt.
 *
 * This is the only place a transaction reaches `succeeded`, and it is the
 * money path. Three properties matter more than anything else here.
 *
 * **It is idempotent.** A provider result can arrive many times — a callback
 * and a poll racing, a retry, five identical lookups (PHASES.md Phase 4
 * acceptance 3). A transaction that is already `succeeded` returns its existing
 * journal rather than posting a second one. Double-crediting a payment is the
 * failure this whole package is built to prevent.
 *
 * **It never trusts an amount.** The provider's gross is compared against what
 * we expected, and a mismatch posts nothing and moves the transaction to
 * `reconciliation_required` for a human (docs/RULES.md §2.8 — never
 * auto-resolve). Money that does not match is not money you book.
 *
 * **The receipt cannot break the ledger.** It is sent last, through a sender
 * that does not throw. A payment is confirmed whether or not an email leaves
 * the building, and unwinding a posted journal over a mail server would turn a
 * delivery problem into an accounting one.
 */
import { and, eq } from 'drizzle-orm';

import {
  customers,
  db,
  invoices,
  journalEntries,
  paymentProviders,
  paymentSessions,
  products,
  transactions,
  type DbTx,
  type Transaction,
} from '@softmato/db';
import {
  DEFAULT_RECEIVABLE_BY_KIND,
  isInvoiceableKind,
  paymentReceivedJournal,
  postJournal,
} from '@softmato/accounting';

import type { AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import type { VerifiedResult } from '../providers/types';
import { buildReceipt, type Receipt, type ReceiptSender } from '../receipts/receipt';
import { transitionSession } from '../sessions/transition';
import { assertTransition, type TxnStatus } from './state-machine';

export interface CompletedPayment {
  transaction: Transaction;
  journalNo: string;
  receipt: Receipt | null;
  /** False when the payment was already settled and nothing was posted. */
  posted: boolean;
}

export async function completePayment(
  tx: DbTx,
  transaction: Transaction,
  verified: VerifiedResult,
  audit: AuditRecorder,
  sendReceipt: ReceiptSender,
  now = new Date(),
): Promise<CompletedPayment> {
  if (verified.status !== 'succeeded') {
    throw new PaymentError(
      'INVALID_STATE',
      `completePayment needs a succeeded result, got ${verified.status}`,
      { txnNo: transaction.txnNo, status: verified.status },
    );
  }

  // Already settled. Return what was posted the first time; post nothing.
  if (transaction.status === 'succeeded') {
    return {
      transaction,
      journalNo: await journalNoOf(tx, transaction.journalId),
      receipt: null,
      posted: false,
    };
  }

  assertTransition(transaction.status as TxnStatus, 'succeeded', {
    txnNo: transaction.txnNo,
  });

  /*
   * The amount check, before anything is written.
   *
   * A provider reporting a different amount than we expected means one of us
   * is wrong, and neither answer is safe to act on. It is flagged and left for
   * a person — never reconciled by taking the provider's word, and never by
   * taking ours (docs/RULES.md §2.8).
   */
  if (verified.grossAmountMinor !== transaction.grossAmountMinor) {
    await flagForReconciliation(transaction, verified, audit);

    throw new PaymentError(
      'AMOUNT_MISMATCH',
      `Provider reported ${verified.grossAmountMinor} for ${transaction.txnNo}, expected ${transaction.grossAmountMinor}`,
      {
        txnNo: transaction.txnNo,
        expectedMinor: transaction.grossAmountMinor.toString(),
        reportedMinor: verified.grossAmountMinor.toString(),
      },
    );
  }

  const context = await settlementContext(tx, transaction);

  const posted = await postJournal(
    tx,
    paymentReceivedJournal({
      transactionId: transaction.id,
      txnNo: transaction.txnNo,
      invoiceNo: context.invoiceNo,
      productId: transaction.productId,
      customerId: transaction.customerId,
      balanceAccount: context.balanceAccount,
      feeAccount: context.feeAccount,
      receivableAccount: context.receivableAccount,
      grossAmountMinor: transaction.grossAmountMinor,
      // Straight from the provider. Never a computed percentage (RULES §2.7).
      providerFeeMinor: verified.providerFeeMinor,
      occurredAt: now,
    }),
  );

  const [settled] = await tx
    .update(transactions)
    .set({
      status: 'succeeded',
      journalId: posted.journalId,
      succeededAt: now,
      providerFeeMinor: verified.providerFeeMinor,
      netAmountMinor: transaction.grossAmountMinor - verified.providerFeeMinor,
      ...(verified.providerTxnId
        ? { providerTxnId: verified.providerTxnId }
        : {}),
      updatedAt: now,
    })
    // Compare-and-set: if something settled this transaction between our read
    // and our write, we lose rather than overwrite. `succeeded_needs_journal`
    // in the schema is the database's own half of the same guarantee.
    .where(
      and(
        eq(transactions.id, transaction.id),
        eq(transactions.status, transaction.status),
      ),
    )
    .returning();

  if (!settled) {
    throw new PaymentError(
      'ILLEGAL_TRANSITION',
      'Transaction changed status concurrently; settlement was refused',
      { txnNo: transaction.txnNo },
    );
  }

  await clearInvoice(tx, transaction, context.invoicePaidMinor);
  await closeSession(tx, transaction);

  await audit(
    {
      actorType: 'system',
      actorId: 'settlement',
      action: 'payment.succeeded',
      resourceType: 'transaction',
      resourceId: transaction.txnNo,
      afterState: {
        journalNo: posted.journalNo,
        grossAmountMinor: transaction.grossAmountMinor.toString(),
        providerFeeMinor: verified.providerFeeMinor.toString(),
        invoiceNo: context.invoiceNo,
      },
    },
    tx,
  );

  const receipt = buildReceipt({
    txnNo: settled.txnNo,
    invoiceNo: context.invoiceNo,
    payerName: context.customerName,
    payerEmail: context.customerEmail,
    amountMinor: settled.grossAmountMinor,
    currency: settled.currency,
    providerName: context.providerName,
    providerRef: settled.providerRef,
    paidAt: now,
    journalNo: posted.journalNo,
  });

  /*
   * Last, and its failure is swallowed here as well as promised by the sender.
   *
   * `ReceiptSender` is documented as never throwing, but a contract is not a
   * guarantee, and the cost of trusting it is the exact disaster described at
   * the top of this file: an exception escaping now would roll back a posted
   * journal and a cleared invoice over an email. The payment is confirmed. The
   * receipt is a courtesy that can be resent.
   */
  try {
    await sendReceipt(receipt);
  } catch (error) {
    await audit(
      {
        actorType: 'system',
        actorId: 'settlement',
        action: 'receipt.send_failed',
        resourceType: 'transaction',
        resourceId: settled.txnNo,
        afterState: {
          reason: error instanceof Error ? error.message : String(error),
        },
      },
      tx,
    );
  }

  return { transaction: settled, journalNo: posted.journalNo, receipt, posted: true };
}

/** Everything the journal and the receipt need, read once. */
async function settlementContext(tx: DbTx, transaction: Transaction) {
  const [row] = await tx
    .select({
      invoiceNo: invoices.invoiceNo,
      invoicePaidMinor: invoices.paidMinor,
      productKind: products.kind,
      customerName: customers.name,
      customerEmail: customers.email,
      providerName: paymentProviders.displayName,
      balanceAccount: paymentProviders.balanceAccount,
      feeAccount: paymentProviders.feeAccount,
    })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .innerJoin(products, eq(products.id, transactions.productId))
    .innerJoin(customers, eq(customers.id, transactions.customerId))
    .innerJoin(
      paymentProviders,
      eq(paymentProviders.id, transactions.providerId),
    )
    .where(eq(transactions.id, transaction.id))
    .limit(1);

  if (!row) {
    throw new PaymentError(
      'INTERNAL',
      'Transaction is missing an invoice, product, customer or provider',
      { txnNo: transaction.txnNo },
    );
  }

  if (!isInvoiceableKind(row.productKind)) {
    throw new PaymentError(
      'INTERNAL',
      `Product kind ${row.productKind} has no receivable account`,
      { txnNo: transaction.txnNo, productKind: row.productKind },
    );
  }

  return {
    ...row,
    // The same account the invoice debited when it was issued, so the
    // receivable it created is the receivable this clears.
    receivableAccount: DEFAULT_RECEIVABLE_BY_KIND[row.productKind],
  };
}

/**
 * Marks the invoice paid to the extent of this payment.
 *
 * `paid_minor` accumulates rather than being set, because an invoice may be
 * settled by more than one payment; `no_overpayment` in the schema is what
 * stops it exceeding the total.
 */
async function clearInvoice(
  tx: DbTx,
  transaction: Transaction,
  paidSoFar: bigint,
): Promise<void> {
  const [invoice] = await tx
    .select({ totalMinor: invoices.totalMinor })
    .from(invoices)
    .where(eq(invoices.id, transaction.invoiceId))
    .limit(1);

  if (!invoice) {
    throw new PaymentError('INTERNAL', 'Invoice vanished mid-settlement', {
      txnNo: transaction.txnNo,
    });
  }

  const paid = paidSoFar + transaction.grossAmountMinor;

  await tx
    .update(invoices)
    .set({
      paidMinor: paid,
      status: paid >= invoice.totalMinor ? 'paid' : 'partially_paid',
    })
    .where(eq(invoices.id, transaction.invoiceId));
}

/**
 * The session follows the payment. Best-effort: a transaction can outlive its
 * session, and a session already moved on is not a reason to unwind a posted
 * payment.
 */
async function closeSession(
  tx: DbTx,
  transaction: Transaction,
): Promise<void> {
  if (!transaction.sessionId) return;

  const [session] = await tx
    .select()
    .from(paymentSessions)
    .where(eq(paymentSessions.id, transaction.sessionId))
    .limit(1);

  if (!session || session.status === 'succeeded') return;

  await transitionSession(tx, session, 'succeeded');
}

/**
 * Raised, recorded, and left alone. Only a human moves it from here.
 *
 * **Written on the pool, deliberately outside the caller's transaction.**
 * `completePayment` throws immediately after calling this, and a throw unwinds
 * whatever transaction it is running inside — so a flag written on `tx` would
 * be rolled back by the very error it exists to report. The mismatch would
 * vanish: the transaction would still read `created`, nothing would record
 * that a provider disagreed with us about an amount, and the next poll would
 * try again and fail again in silence.
 *
 * The flag is a fact about something that happened, and it has to outlive the
 * attempt that discovered it. Same reasoning for the audit entry, which is
 * recorded with no `tx` for exactly the same reason.
 */
async function flagForReconciliation(
  transaction: Transaction,
  verified: VerifiedResult,
  audit: AuditRecorder,
): Promise<void> {
  await db
    .update(transactions)
    .set({ status: 'reconciliation_required', updatedAt: new Date() })
    .where(eq(transactions.id, transaction.id));

  await audit({
    actorType: 'system',
    actorId: 'settlement',
    action: 'payment.amount_mismatch',
    resourceType: 'transaction',
    resourceId: transaction.txnNo,
    beforeState: { expectedMinor: transaction.grossAmountMinor.toString() },
    afterState: { reportedMinor: verified.grossAmountMinor.toString() },
  });
}

async function journalNoOf(
  tx: DbTx,
  journalId: number | null,
): Promise<string> {
  if (journalId === null) {
    // `succeeded_needs_journal` makes this unreachable for a settled row.
    throw new PaymentError('INTERNAL', 'Settled transaction has no journal', {});
  }

  const [journal] = await tx
    .select({ journalNo: journalEntries.journalNo })
    .from(journalEntries)
    .where(eq(journalEntries.id, journalId))
    .limit(1);

  return journal?.journalNo ?? '';
}
