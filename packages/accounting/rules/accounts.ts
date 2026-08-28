/**
 * The account codes the posting rules reach for, in one place.
 *
 * These are constants, not settings. `MEMORY.md` states the boundary plainly:
 * account codes, posting rules, period boundaries and provider credentials
 * never move into `platform_settings`, because a value editable from a form
 * must not be able to move posted money.
 *
 * Every code here appears in docs/CHART_OF_ACCOUNTS.md. Nothing is invented.
 */

/** docs/CHART_OF_ACCOUNTS.md §2 — receivables. */
export const RECEIVABLE = {
  saas: '1110', // AR — SaaS Subscriptions
  agency: '1120', // AR — Projects & Agency
  support: '1130', // AR — Maintenance & Support
} as const;

/** docs/CHART_OF_ACCOUNTS.md §3 — what we owe a customer who paid in advance. */
export const DEFERRED_REVENUE = '2110';

/** docs/CHART_OF_ACCOUNTS.md §5 — revenue. Contra accounts are not here. */
export const REVENUE = {
  saasSubscription: '4010',
  softwareDevelopment: '4020',
  websiteAndDesign: '4030',
  maintenanceAndSupport: '4040',
  setupFees: '4050',
  other: '4090',
} as const;

/**
 * docs/CHART_OF_ACCOUNTS.md §2 — the company's own bank account.
 *
 * Payments do not land here directly. A confirmed payment debits the
 * provider's balance account (§9.2); the move into the bank is a separate
 * entry posted from the settlement advice (§9.5).
 */
export const BANK_CURRENT = '1020';

/**
 * Defaults per product kind, used when a caller does not name a revenue
 * account. The chart deliberately does not split revenue per product — both
 * HostelHub and QuestionCall post to 4010 and are told apart by `product_id`
 * (docs/CHART_OF_ACCOUNTS.md §5).
 *
 * `corporate` has no default: it is the shared-overhead dimension, not
 * something a customer is ever invoiced for.
 */
export const DEFAULT_REVENUE_BY_KIND = {
  saas: REVENUE.saasSubscription,
  agency: REVENUE.softwareDevelopment,
} as const;

export const DEFAULT_RECEIVABLE_BY_KIND = {
  saas: RECEIVABLE.saas,
  agency: RECEIVABLE.agency,
} as const;

export type InvoiceableProductKind = keyof typeof DEFAULT_REVENUE_BY_KIND;

export function isInvoiceableKind(kind: string): kind is InvoiceableProductKind {
  return kind in DEFAULT_REVENUE_BY_KIND;
}
