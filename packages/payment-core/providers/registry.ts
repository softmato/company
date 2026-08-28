/**
 * Resolving a provider id to the code that talks to that provider.
 *
 * Registration is inverted on purpose. If this module imported the four
 * adapters directly, `payment-core` would depend on every gateway SDK, and
 * importing anything from the package — the state machine, the error types —
 * would pull Khalti's HTTP client into the bundle with it. Adapters register
 * themselves at composition time instead, so the core stays a package about
 * payments rather than a package about four specific companies.
 *
 * The practical consequence, and the reason it is worth the indirection:
 * Phases 4, 5 and 9 add eSewa, Khalti and Fonepay by writing an adapter and
 * calling `registerProvider`. Nothing in this file changes.
 */
import { PaymentError } from '../errors';
import { isProviderId, type ProviderAdapter, type ProviderId } from './types';

const REGISTRY = new Map<ProviderId, ProviderAdapter>();

export function registerProvider(adapter: ProviderAdapter): void {
  // A second registration is a wiring bug — two modules each believing they own
  // a provider — and the failure it causes otherwise is a payment going to
  // whichever one loaded last. That is not a bug anyone finds by reading code.
  if (REGISTRY.has(adapter.id)) {
    throw new PaymentError(
      'INTERNAL',
      `Provider ${adapter.id} is already registered`,
      { providerId: adapter.id },
    );
  }

  REGISTRY.set(adapter.id, adapter);
}

/**
 * Throws when nothing is registered. A configured-but-unimplemented provider is
 * a `payment_providers` row with `is_active = true` and no adapter behind it —
 * which is how a provider ends up offered on a checkout page that cannot then
 * take the payment. Fail loudly here rather than at the point of money.
 */
export function providerAdapter(providerId: string): ProviderAdapter {
  if (!isProviderId(providerId)) {
    throw new PaymentError('VALIDATION_FAILED', 'Unknown provider', {
      providerId,
    });
  }

  const adapter = REGISTRY.get(providerId);

  if (!adapter) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      `No adapter is registered for ${providerId}`,
      { providerId },
    );
  }

  return adapter;
}

export function hasProvider(providerId: string): boolean {
  return isProviderId(providerId) && REGISTRY.has(providerId);
}

/** Which providers actually have code behind them, in registration order. */
export function registeredProviders(): ProviderId[] {
  return [...REGISTRY.keys()];
}

/** Test-only. Nothing on a payment path may call this. */
export function resetProviderRegistry(): void {
  REGISTRY.clear();
}
