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
 *
 * ## Why an adapter is keyed by a pair
 *
 * A provider is not one thing. eSewa in its sandbox and eSewa in production
 * are two sets of credentials pointed at two hosts, and which of them a
 * payment belongs to is decided by the credential that opened it rather than
 * by the deployment it landed on. A single deployment therefore holds both,
 * and an adapter is registered per `(provider, mode)`.
 *
 * **The mode is a required argument, never a defaulted one.** A default would
 * be wrong exactly once — on the call site somebody forgot — and the symptom
 * would be a Sandbox payment verified against the live gateway, which is the
 * failure this whole arrangement exists to make impossible.
 */
import type { CredentialMode } from '@softmato/db';

import { PaymentError } from '../errors';
import { isProviderId, type ProviderAdapter, type ProviderId } from './types';

/** Keyed `<mode>:<providerId>`, so the two modes cannot collide. */
const REGISTRY = new Map<string, ProviderAdapter>();

function registryKey(providerId: ProviderId, mode: CredentialMode): string {
  return `${mode}:${providerId}`;
}

export function registerProvider(
  adapter: ProviderAdapter,
  mode: CredentialMode,
): void {
  // A second registration is a wiring bug — two modules each believing they own
  // a provider — and the failure it causes otherwise is a payment going to
  // whichever one loaded last. That is not a bug anyone finds by reading code.
  //
  // Registering the same provider under both modes is not that case: it is the
  // normal arrangement, and the key keeps them apart.
  const key = registryKey(adapter.id, mode);

  if (REGISTRY.has(key)) {
    throw new PaymentError(
      'INTERNAL',
      `Provider ${adapter.id} is already registered for ${mode}`,
      { providerId: adapter.id, mode },
    );
  }

  REGISTRY.set(key, adapter);
}

/**
 * Throws when nothing is registered for that pair. A configured-but-
 * unimplemented provider is a `payment_providers` row with `is_active = true`
 * and no adapter behind it — which is how a provider ends up offered on a
 * checkout page that cannot then take the payment. Fail loudly here rather
 * than at the point of money.
 *
 * A provider registered for one mode and not the other fails the same way, and
 * should: a deployment holding only sandbox eSewa credentials genuinely cannot
 * take a Production payment through eSewa, and pretending otherwise would send
 * a real customer to a gateway that will reject them.
 */
export function providerAdapter(
  providerId: string,
  mode: CredentialMode,
): ProviderAdapter {
  if (!isProviderId(providerId)) {
    throw new PaymentError('VALIDATION_FAILED', 'Unknown provider', {
      providerId,
    });
  }

  const adapter = REGISTRY.get(registryKey(providerId, mode));

  if (!adapter) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      `No adapter is registered for ${providerId} in ${mode}`,
      { providerId, mode },
    );
  }

  return adapter;
}

export function hasProvider(providerId: string, mode: CredentialMode): boolean {
  return (
    isProviderId(providerId) && REGISTRY.has(registryKey(providerId, mode))
  );
}

/**
 * Which providers actually have code behind them for a mode, in registration
 * order. Asked per mode because "what can this deployment do" has a different
 * answer for a Sandbox caller than a Production one.
 */
export function registeredProviders(mode: CredentialMode): ProviderId[] {
  const prefix = `${mode}:`;

  return [...REGISTRY.keys()]
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length) as ProviderId);
}

/** Test-only. Nothing on a payment path may call this. */
export function resetProviderRegistry(): void {
  REGISTRY.clear();
}
