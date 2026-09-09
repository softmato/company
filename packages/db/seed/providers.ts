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
 * **A provider is active once its adapter and its credentials both exist, and
 * not one commit before.** An active row with no working adapter behind it
 * offers a customer a method that fails at the moment they try to pay, which
 * is the failure this column exists to prevent.
 *
 * eSewa and Khalti now satisfy both halves — `EsewaProviderAdapter` and
 * `KhaltiProviderAdapter` are real, and their sandbox credentials are verified
 * against the gateways — so they ship active. Fonepay does not: its adapter is
 * an honest stub pending the bank's integration document (PHASES.md Phase 9),
 * and `lib/payments/providers.ts` refuses to register it at all.
 *
 * Shipping the wallets inactive is what made "it works in dev but not in
 * production" a structural certainty rather than bad luck: every environment
 * was seeded dead, and the only way one ever came alive was somebody typing
 * UPDATE into a database console. `is_active` is a statement about whether the
 * integration exists, and the integration is in the repository — so the answer
 * belongs here, where every environment reads the same one.
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
    /*
     * Adapter and credentials both exist. Which *set* of credentials a payment
     * uses is the session's mode, not this flag — an active row with only
     * sandbox keys configured serves Sandbox sessions and is correctly refused
     * for Production ones by the registry.
     */
    isActive: true,
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
    isActive: true,
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
