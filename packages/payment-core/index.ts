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
  assertRegisteredHost,
  isRegisteredHost,
  normalizeHostname,
  normalizeHostnameInput,
} from './applications/domains';

export {
  revealWebhookSecret,
  rotateWebhookSecret,
} from './applications/webhook-secret';

export {
  addDomain,
  listDomains,
  removeDomain,
  type AddDomainInput,
} from './applications/domains-manage';

export {
  registerApplication,
  revokeApplication,
  rotateSecret,
  updateApplication,
  type DomainInput,
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
  buildSnapshots,
  invoiceMetadata,
  partySnapshot,
  type InvoiceSnapshots,
  type PartySnapshot,
} from './invoices/snapshot';

export {
  PROVIDER_IDS,
  isProviderId,
  type FormPost,
  type InitiateResult,
  type ProviderAdapter,
  type ProviderId,
  type RefundResult,
  type VerifiedResult,
  type VerifiedStatus,
} from './providers/types';

export {
  requireCredential,
  resolveBaseUrl,
  resolveEnv,
  type ProviderEnv,
} from './providers/credentials';

export {
  MINOR_EXPONENT,
  decimalFromMinor,
  minorFromDecimal,
  minorFromInteger,
} from './providers/money';

export { mapProviderStatus, type StatusMap } from './providers/status';

export {
  hasProvider,
  providerAdapter,
  registerProvider,
  registeredProviders,
  resetProviderRegistry,
} from './providers/registry';

export { KhaltiProviderAdapter, type KhaltiConfig } from './providers/khalti';
export { EsewaProviderAdapter, type EsewaConfig } from './providers/esewa';
export {
  FonepayProviderAdapter,
  type FonepayConfig,
} from './providers/fonepay';
export { MockProviderAdapter, type MockConfig } from './providers/mock';

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

export { expireIfDue, loadPayableSession, loadSession } from './sessions/load';

export { SESSION_TTL_MS, isPastExpiry } from './sessions/expiry';

export { transitionSession, type TransitionPatch } from './sessions/transition';

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
  transitionTransaction,
  type TransitionOptions,
} from './transactions/transition';

export {
  settleTransaction,
  type SettlementOutcome,
} from './transactions/settle';

export { confirmTransaction } from './transactions/confirm';

export {
  eventIdFor,
  recordProviderEvent,
  type ProviderEventInput,
  type ProviderEventType,
} from './providers/events';

export { latestAttempt } from './transactions/latest';

export { findTransactionView, type TransactionView } from './transactions/view';

export {
  FIRST_DELAY_MS,
  MAX_DELAY_MS,
  MAX_POLL_ATTEMPTS,
  nextPollAt,
  pollDelayMs,
  pollExhausted,
} from './jobs/backoff';

export {
  expireStaleSessions,
  type ExpireSessionsResult,
} from './jobs/expire-sessions';

export {
  pollPendingTransactions,
  type PollPendingResult,
} from './jobs/poll-pending';

export {
  MAX_AGE_SECONDS,
  sign as signWebhook,
  signingBase as webhookSigningBase,
  verify as verifyWebhook,
  type VerifyFailure,
  type VerifyInput,
  type VerifyResult,
} from './webhooks/signature';

export {
  WEBHOOK_EVENTS,
  buildPayload as buildWebhookPayload,
  eventForStatus,
  type WebhookEvent,
  type WebhookPayload,
} from './webhooks/events';

export { enqueueWebhook, type EnqueueResult } from './webhooks/enqueue';

export {
  MAX_ATTEMPTS as MAX_WEBHOOK_ATTEMPTS,
  retryWebhooks,
  type RetryWebhooksResult,
} from './webhooks/deliver';

export {
  buildReceipt,
  type Receipt,
  type ReceiptInput,
  type ReceiptSender,
} from './receipts/receipt';

export {
  requestRefund,
  type FiledRefund,
  type RequestRefundInput,
} from './refunds/request';
