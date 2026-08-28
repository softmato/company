/**
 * Payment providers — docs/API.md §5, docs/CHART_OF_ACCOUNTS.md §§9.2–9.5, §10.
 *
 * **Fonepay is the primary integration; eSewa and Khalti are the secondary
 * wallets.** `sort_order` encodes that, lowest first, and is what decides the
 * order a customer sees once amount-based routing (API.md §8) has filtered the
 * list.
 *
 * `manual_qr` was removed on 2026-08-16. Every payment now goes through a
 * gateway; nothing is credited on an admin's say-so any more.
 *
 * ⚠ **Every provider here is inactive, so no payment can currently be taken.**
 * That is not an oversight — each one is gated on merchant credentials that
 * have not arrived (MEMORY.md, blocked on external parties), and an active row
 * with no working adapter behind it would offer a customer a method that fails
 * when they try to pay. Activate a provider in the same change that lands its
 * adapter and its credentials, never before.
 *
 * `maxAmountMinor` is left NULL deliberately. Wallets do have per-transaction
 * limits (API.md §8), but no document here states the numbers, and inventing a
 * routing limit is the kind of guess RULES.md §1 forbids. Set them once the
 * founder confirms each provider's contracted limit.
 */
import type { paymentProviders } from '../schema/providers';

type ProviderSeed = typeof paymentProviders.$inferInsert;

export const providerSeeds: ProviderSeed[] = [
  {
    id: 'fonepay',
    displayName: 'Fonepay',
    /**
     * The primary route: a full merchant integration reaching bank accounts
     * and wallets rather than one wallet's customers.
     *
     * Phase 9 in PHASES.md, and blocked on the bank's credentials and its
     * integration document. Making it primary does not unblock it — and
     * PHASES.md is explicit that Fonepay request shapes must not be guessed at.
     */
    isActive: false,
    balanceAccount: '1033',
    feeAccount: '5010',
    supportsRefund: false,
    supportsCallback: false,
    requiresPolling: true,
    pollIntervalSec: 60,
    pollTimeoutSec: 3600,
    sortOrder: 10,
  },
  {
    id: 'esewa',
    displayName: 'eSewa',
    // Enabled once production credentials arrive (MEMORY.md, blocked items).
    isActive: false,
    balanceAccount: '1031',
    feeAccount: '5010',
    supportsRefund: false,
    supportsCallback: true,
    // A suppressed callback must still be recovered by polling.
    requiresPolling: true,
    pollIntervalSec: 60,
    pollTimeoutSec: 3600,
    sortOrder: 20,
  },
  {
    id: 'khalti',
    displayName: 'Khalti',
    isActive: false,
    balanceAccount: '1032',
    feeAccount: '5010',
    supportsRefund: true,
    // Khalti has no webhook: polling IS the confirmation path.
    supportsCallback: false,
    requiresPolling: true,
    pollIntervalSec: 60,
    pollTimeoutSec: 3600,
    sortOrder: 30,
  },
];
