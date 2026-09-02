/**
 * The composition root for payment providers.
 *
 * `packages/payment-core` deliberately does not import its own adapters — the
 * registry is inverted so that the core stays a package about payments rather
 * than a package about three specific companies (see
 * `providers/registry.ts`). The consequence is that *somebody* has to do the
 * registering, and until now nobody did: `registerProvider` was called nowhere
 * in `apps/web`, so the registry was empty at runtime and `providerAdapter()`
 * threw for every provider. The engine was complete and had no ignition.
 *
 * This module is that ignition, and it is the only place allowed to decide
 * which adapters exist.
 *
 * ## The policy
 *
 * | `PAYMENT_MODE` | What gets registered |
 * | --- | --- |
 * | `mock` | `MockProviderAdapter` for eSewa and Khalti. Nothing talks to a gateway. |
 * | `sandbox` / `live` | The real adapter for each provider whose credentials are present. |
 *
 * Two rules hold in every mode:
 *
 * **A provider without credentials is not registered.** It is not registered
 * with a fallback, and it is certainly not registered with an adapter that
 * fakes success — that was the defect this whole section of work exists to
 * remove. An unregistered provider cannot be selected, so a customer is never
 * offered a way to pay that cannot take their money.
 *
 * **Fonepay is never registered.** Its adapter is an honest stub pending the
 * bank's integration document (PHASES.md Phase 9), and registering a stub
 * would put it on checkout pages.
 */
import 'server-only';

import {
  EsewaProviderAdapter,
  KhaltiProviderAdapter,
  MockProviderAdapter,
  hasProvider,
  registeredProviders,
  registerProvider,
  type ProviderAdapter,
  type ProviderId,
} from '@softmato/payment-core';

import { env } from '@/lib/env';

/** Which providers a mock deployment stands in for. Never Fonepay. */
const MOCKABLE: readonly ProviderId[] = ['esewa', 'khalti'];

/**
 * Registers an adapter unless the registry already has one for that id.
 *
 * **The idempotence has to come from the registry, not from a flag in this
 * module.** It used to be a module-level `let registered = false`, which
 * assumes this module and `payment-core`'s registry share a lifetime. They do
 * not: Next's dev server re-evaluates changed modules independently, so
 * editing this file — or anything it imports — reset the flag while the
 * registry kept its entries, and the next request died with
 * `Provider esewa is already registered`. A 500 on the checkout page, from a
 * guard whose entire job was to prevent one.
 *
 * The throw inside `registerProvider` stays, and still means what it says: two
 * *different* modules each claiming a provider is a wiring bug worth failing
 * on. This function is not that case. It is the single declared owner of
 * registration asking whether it has already done its own work.
 */
function registerIfAbsent(adapter: ProviderAdapter): void {
  if (hasProvider(adapter.id)) return;

  registerProvider(adapter);
}

/**
 * Registers every enabled adapter. Safe to call on every request.
 *
 * Next imports this from several entry points — a page, a server action, a
 * cron route — and any of them may be the first to run.
 */
export function ensureProvidersRegistered(): void {
  if (env.PAYMENT_MODE === 'mock') registerMocks();
  else registerReal();

  /*
   * Read back from the registry rather than counting what this call
   * registered. On the second and later calls that count is zero — everything
   * was already there — and treating that as "nobody can pay" would turn a
   * correctly configured deployment into a boot failure on its second request.
   */
  if (registeredProviders().length === 0) {
    /*
     * Nobody can pay. Worth failing on rather than discovering at a checkout
     * page, because every symptom downstream of it is misleading: the session
     * is created, the invoice exists, the page renders, and the only thing
     * that goes wrong is that the provider list is empty.
     */
    throw new Error(
      'No payment provider is configured. Set ESEWA_MERCHANT_CODE and ' +
        'ESEWA_SECRET_KEY (their sandbox values are public), or set ' +
        'KHALTI_SECRET_KEY, or run with PAYMENT_MODE=mock.',
    );
  }
}

function registerMocks(): void {
  for (const id of MOCKABLE) {
    registerIfAbsent(new MockProviderAdapter({ id }));
  }
}

/**
 * Real adapters, each one skipped rather than half-built when its credentials
 * are absent.
 *
 * The adapters throw from their own constructors when a credential is missing,
 * so the presence checks here are not a second line of defence — they are what
 * makes "absent" mean *not offered* instead of *offered and broken*.
 */
function registerReal(): void {
  // Checked as a pair; `lib/env.ts` has already refused a half-configured one.
  if (env.ESEWA_MERCHANT_CODE && env.ESEWA_SECRET_KEY && !hasProvider('esewa')) {
    registerProvider(new EsewaProviderAdapter());
  }

  if (env.KHALTI_SECRET_KEY && !hasProvider('khalti')) {
    registerProvider(new KhaltiProviderAdapter());
  }
}

/**
 * Which providers can actually take a payment right now.
 *
 * The checkout page intersects this with the session's `allowed_providers`.
 * That list was written when the session was created and is what the customer
 * is held to, but a provider in it whose adapter is not registered would
 * render a button that throws — so the intersection, not either list alone, is
 * what gets drawn.
 */
export function availableProviders(): ProviderId[] {
  ensureProvidersRegistered();

  return registeredProviders();
}
