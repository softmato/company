/**
 * Provider selection → a payment attempt on the books.
 *
 * This is the seam between the customer's journey and the money: before it, a
 * session is a page someone is looking at; after it, there is a `transactions`
 * row that an admin can approve and a journal can hang off.
 *
 * **The rule that shapes this file: one live attempt per session and provider.**
 * Every `initiate()` books a fresh intent at the gateway and returns a fresh
 * provider reference. A customer who refreshes the checkout page and gets a
 * second reference leaves two live intents against one invoice, either of
 * which they might complete — and the one they pay is then not the one we are
 * polling. So a refresh returns the attempt that already exists, unchanged,
 * rather than starting another.
 */
import { and, eq, inArray } from 'drizzle-orm';

import {
  transactions,
  type DbTx,
  type PaymentSession,
  type Transaction,
} from '@softmato/db';
import { allocateDocumentNo, resolveFiscalPeriod } from '@softmato/accounting';

import type { AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import { providerAdapter } from '../providers/registry';
import type { FormPost, InitiateResult } from '../providers/types';
import { selectProvider } from '../sessions/select-provider';
import { transitionSession } from '../sessions/transition';
import { isTerminal, type TxnStatus } from './state-machine';

export interface StartPaymentInput {
  sessionId: string;
  providerId: string;
}

export interface StartedPayment {
  session: PaymentSession;
  transaction: Transaction;
  /** What to show the customer: a QR, a redirect, a deeplink. */
  initiate: InitiateResult;
  /** False when a live attempt already existed and was returned unchanged. */
  created: boolean;
}

/**
 * Takes the transaction rather than opening one. Two reasons, both hard:
 * `allocateDocumentNo` serialises on a transaction-scoped advisory lock and
 * must run in the same transaction as the insert or it leaves a hole in the
 * sequence (docs/DATABASE.md §3); and on the API path this has to commit
 * together with the idempotency record.
 */
export async function startPayment(
  tx: DbTx,
  input: StartPaymentInput,
  audit: AuditRecorder,
  now = new Date(),
): Promise<StartedPayment> {
  // Loads the session, settles expiry, refuses anything unpayable, checks the
  // provider was offered, and moves the session to `provider_selected`.
  const session = await selectProvider(
    tx,
    input.sessionId,
    input.providerId,
    now,
  );

  const existing = await liveAttempt(tx, session.id, input.providerId);

  if (existing) {
    return {
      session,
      transaction: existing,
      initiate: storedInitiate(existing),
      created: false,
    };
  }

  const adapter = providerAdapter(input.providerId);

  /*
   * ⚠ Ordering to revisit with the first real gateway.
   *
   * `initiate()` runs before the insert. Every remaining provider makes a real
   * network call here, so succeeding at the gateway and then failing to commit
   * would leave a payment booked at the provider with no record of it on our
   * side — the customer could pay against an intent we never wrote down.
   *
   * This was safe while the only provider was local. It is not obviously safe
   * now, and the fix (commit the row first, then initiate, then attach the
   * reference) has its own failure mode: a row with no provider reference.
   * Decide it against a real gateway's semantics in Phase 4 rather than guess
   * here. `poll()` and reconciliation are the backstop either way.
   */
  const initiate = await adapter.initiate(session);

  const period = await resolveFiscalPeriod(tx, now);
  const { documentNo } = await allocateDocumentNo(tx, 'TXN', period.fiscalYear);

  const gross = session.amountMinor;

  const [transaction] = await tx
    .insert(transactions)
    .values({
      txnNo: documentNo,
      sessionId: session.id,
      invoiceId: session.invoiceId,
      applicationId: session.applicationId,
      productId: session.productId,
      customerId: session.customerId,
      providerId: input.providerId,
      providerRef: initiate.providerRef,
      ...(initiate.correlationId
        ? { providerCorrelationId: initiate.correlationId }
        : {}),
      status: 'created',
      grossAmountMinor: gross,
      /*
       * Zero, and not an estimate. The fee is whatever the provider reports at
       * settlement and is never computed as a percentage (docs/RULES.md §2.7),
       * so it stays zero until a verified result carries a real one.
       */
      providerFeeMinor: 0n,
      netAmountMinor: gross,
      currency: session.currency,
      // What the customer was actually shown, kept so a dispute can be
      // answered later and so a refresh shows the same thing.
      metadata: { initiate: displayable(initiate) },
    })
    .returning();

  if (!transaction) {
    throw new PaymentError('INTERNAL', 'Transaction insert returned no row', {
      sessionId: session.id,
    });
  }

  // An attempt is now in flight. `pending → provider_selected` stays legal, so
  // a customer who changes their mind is not trapped here.
  const pending = await transitionSession(tx, session, 'pending');

  await audit(
    {
      actorType: 'system',
      actorId: 'checkout',
      action: 'transaction.start',
      resourceType: 'transaction',
      resourceId: transaction.txnNo,
      afterState: {
        sessionId: session.id,
        providerId: input.providerId,
        providerRef: initiate.providerRef,
        grossAmountMinor: gross.toString(),
      },
    },
    tx,
  );

  return { session: pending, transaction, initiate, created: true };
}

/**
 * An attempt on this session and provider that has not reached a terminal
 * state. Terminal ones are left behind deliberately: a failed attempt is the
 * record that it happened, and the customer trying again gets a new row rather
 * than a resurrected one.
 */
async function liveAttempt(
  tx: DbTx,
  sessionId: string,
  providerId: string,
): Promise<Transaction | undefined> {
  const live = TXN_STATUSES.filter((status) => !isTerminal(status));

  const [existing] = await tx
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.sessionId, sessionId),
        eq(transactions.providerId, providerId),
        inArray(transactions.status, live),
      ),
    )
    .limit(1);

  return existing;
}

/**
 * Listed rather than derived, so that adding a transaction status is a type
 * error here and somebody has to decide whether a customer may still be
 * looking at it.
 */
const TXN_STATUSES: readonly TxnStatus[] = [
  'created',
  'pending',
  'succeeded',
  'failed',
  'cancelled',
  'expired',
  'partially_refunded',
  'refunded',
  'reversed',
  'reconciliation_required',
];

/**
 * The display half of an initiate result — never the whole thing.
 *
 * `formPost` is stored alongside the rest because a gateway entered by form
 * POST has to be re-enterable on a refresh, and its signature covers the exact
 * field values. Re-deriving them would mean signing again, and signing again
 * means a second `transaction_uuid` — the precise duplicate-intent failure the
 * comment at the top of this file exists to prevent. Nothing in it is secret:
 * it is a signature over public values, good for this transaction only.
 */
function displayable(initiate: InitiateResult): Record<string, unknown> {
  return {
    ...(initiate.qrPayload ? { qrPayload: initiate.qrPayload } : {}),
    ...(initiate.redirectUrl ? { redirectUrl: initiate.redirectUrl } : {}),
    ...(initiate.deeplink ? { deeplink: initiate.deeplink } : {}),
    ...(initiate.formPost ? { formPost: initiate.formPost } : {}),
  };
}

/**
 * Rebuilds what the customer was shown from the row, for a refresh.
 *
 * Deliberately not a fresh `initiate()` call: that would mint a second
 * reference code and is exactly the failure this module exists to prevent.
 */
function storedInitiate(transaction: Transaction): InitiateResult {
  const stored = (transaction.metadata?.initiate ?? {}) as Record<
    string,
    unknown
  >;

  const text = (key: string): string | undefined =>
    typeof stored[key] === 'string' ? (stored[key] as string) : undefined;

  const qrPayload = text('qrPayload');
  const redirectUrl = text('redirectUrl');
  const deeplink = text('deeplink');
  const formPost = storedFormPost(stored.formPost);

  return {
    providerRef: transaction.providerRef ?? '',
    ...(qrPayload ? { qrPayload } : {}),
    ...(redirectUrl ? { redirectUrl } : {}),
    ...(deeplink ? { deeplink } : {}),
    ...(formPost ? { formPost } : {}),
    ...(transaction.providerCorrelationId
      ? { correlationId: transaction.providerCorrelationId }
      : {}),
  };
}

/**
 * Rebuilds a stored `formPost`, or returns nothing.
 *
 * Validated field by field rather than cast, because this is JSON that has
 * been through the database and back: a shape assertion here would be a
 * guess, and the thing it would be guessing about is what the browser posts to
 * a payment gateway.
 */
function storedFormPost(value: unknown): FormPost | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const { url, fields } = value as Record<string, unknown>;

  if (typeof url !== 'string' || !url) return undefined;
  if (!fields || typeof fields !== 'object') return undefined;

  const entries = Object.entries(fields as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

  return { url, fields: Object.fromEntries(entries) };
}
