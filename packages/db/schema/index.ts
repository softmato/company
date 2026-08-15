/**
 * Schema modules translated from docs/schema.sql, one file per domain.
 *
 * Triggers, constraint functions, and views live in hand-written migrations —
 * Drizzle Kit does not generate them, and a regeneration must never drop them.
 * See docs/RULES.md §3 before changing anything here.
 */
export * from './accounts';
export * from './fiscal';
export * from './ledger';
export * from './applications';
export * from './customers';
export * from './invoices';
export * from './providers';
export * from './payments';
export * from './subscriptions';
export * from './reconciliation';
export * from './audit';
export * from './cms';
export * from './settings';
export * from './views';
