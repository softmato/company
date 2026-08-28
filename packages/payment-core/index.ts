// packages/payment-core — no `next` import, ever. See docs/FOLDER_STRUCTURE.md.

export {
  PaymentError,
  PAYMENT_ERROR_STATUS,
  isPaymentError,
  type PaymentErrorCode,
} from './errors';

export type { Actor, AuditRecord, AuditRecorder } from './audit';

export {
  clientIdFromSecret,
  constantTimeEquals,
  generateClientId,
  issueSecret,
  verifySecret,
  type IssuedSecret,
} from './applications/credentials';

export {
  assertScope,
  authenticateApplication,
  type AuthenticatedApplication,
} from './applications/authenticate';

export {
  registerApplication,
  revokeApplication,
  rotateSecret,
  updateApplication,
  type IssuedCredential,
  type RegisterInput,
  type RotationResult,
} from './applications/manage';

export {
  withIdempotency,
  type HandlerResult,
  type IdempotentOutcome,
  type IdempotentRequest,
} from './idempotency';

/** Re-exported so route handlers need not import from `@softmato/db` too. */
export type { DbTx as DbTxHandler } from '@softmato/db';

export {
  createSession,
  type CreateSessionInput,
  type CreatedSession,
} from './sessions/create';

export {
  createInvoice,
  type CreateInvoiceInput,
  type CreatedInvoice,
  type CustomerInput,
  type InvoiceLineInput,
} from './invoices/create';

export {
  PROVIDER_IDS,
  isProviderId,
  type InitiateResult,
  type ProviderAdapter,
  type ProviderId,
  type RefundResult,
  type VerifiedResult,
  type VerifiedStatus,
} from './providers/types';

export {
  hasProvider,
  providerAdapter,
  registerProvider,
  registeredProviders,
  resetProviderRegistry,
} from './providers/registry';


export {
  assertTransition as assertTxnTransition,
  canTransition as canTxnTransition,
  isSettled,
  isTerminal,
  type TxnStatus,
} from './transactions/state-machine';

export {
  assertTransition as assertSessionTransition,
  canTransition as canSessionTransition,
  isPayable,
  type SessionStatus,
} from './sessions/state-machine';

export { generateSessionId, isSessionIdShape } from './sessions/id';

export {
  expireIfDue,
  loadPayableSession,
  loadSession,
} from './sessions/load';

export { SESSION_TTL_MS, isPastExpiry } from './sessions/expiry';

export {
  transitionSession,
  type TransitionPatch,
} from './sessions/transition';

export { selectProvider } from './sessions/select-provider';

export {
  startPayment,
  type StartPaymentInput,
  type StartedPayment,
} from './transactions/start';

export {
  completePayment,
  type CompletedPayment,
} from './transactions/complete';

export {
  buildReceipt,
  type Receipt,
  type ReceiptInput,
  type ReceiptSender,
} from './receipts/receipt';
