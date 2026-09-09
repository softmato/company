/**
 * The composition root for payment providers — the policy half.
 *
 * `packages/payment-core` deliberately does not import its own adapters: the
 * registry is inverted so that the core stays a package about payments rather
 * than a package about three specific companies (see `providers/registry.ts`).
 * The consequence is that *somebody* has to do the registering, and this is
 * that somebody. It is the only module allowed to decide which adapters exist.
 *
 * **Why this is split from `./providers`.** That module is `server-only`, and
 * `server-only` throws when it is imported outside Next — which makes the
 * policy unreachable from `scripts/demo-checkout.mts`, a script that calls
 * `createSession` and therefore needs the same answer to "which providers can
 * this deployment actually serve" that the app gets. A script cannot be
 * allowed to answer that question a second way: two spellings of the policy is
 * how a tool ends up issuing sessions the server cannot honour. So the policy
 * lives here, importable by both, and `./providers` binds it to the validated
 * environment. Same shape as `totp.ts` / `totp.core.ts`.
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

import type { CredentialMode } from '@softmato/db';

/**
 * What this module needs from the environment.
 *
 * Deliberately a bag of optional strings rather than the validated `env`
 * object, so that `process.env` satisfies it too — that is what lets a script
 * run the real policy instead of an approximation of it.
 */
export interface ProviderEnv {
  PAYMENT_MODE?: string | undefined;

  ESEWA_MERCHANT_CODE?: string | undefined;
  ESEWA_SECRET_KEY?: string | undefined;
  ESEWA_BASE_URL?: string | undefined;
  ESEWA_SANDBOX_MERCHANT_CODE?: string | undefined;
  ESEWA_SANDBOX_SECRET_KEY?: string | undefined;
  ESEWA_LIVE_MERCHANT_CODE?: string | undefined;
  ESEWA_LIVE_SECRET_KEY?: string | undefined;

  KHALTI_SECRET_KEY?: string | undefined;
  KHALTI_BASE_URL?: string | undefined;
  KHALTI_SANDBOX_SECRET_KEY?: string | undefined;
  KHALTI_LIVE_SECRET_KEY?: string | undefined;
}

/** Which providers a mock deployment stands in for. Never Fonepay. */
const MOCKABLE: readonly ProviderId[] = ['esewa', 'khalti'];

/** Both credential sets are registered on every deployment that has them. */
const MODES: readonly CredentialMode[] = ['test', 'live'];

/**
 * A variable that is present but blank is a variable nobody set.
 *
 * **This is not a tidy-up; it is the bug.** The resolution below is a chain of
 * `??`, which falls through `undefined` and *not* through `''`. A deployment
 * carrying `ESEWA_SANDBOX_MERCHANT_CODE=` — exactly what pasting
 * `.env.example` into a hosting dashboard produces — therefore stopped falling
 * back to `ESEWA_MERCHANT_CODE`, and eSewa silently vanished from Sandbox on a
 * deployment whose dashboard showed every credential present. `lib/env.ts`
 * normalises this too, but the guarantee has to hold for a caller passing raw
 * `process.env`, so it is enforced where the chain actually runs.
 */
function set(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

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
function registerIfAbsent(
  adapter: ProviderAdapter,
  mode: CredentialMode,
): void {
  if (hasProvider(adapter.id, mode)) return;

  registerProvider(adapter, mode);
}

/**
 * Registers every enabled adapter. Safe to call on every request.
 *
 * Next imports this from several entry points — a page, a server action, an
 * API route, a cron route — and any of them may be the first to run.
 */
export function registerFromEnv(source: ProviderEnv): void {
  if (paymentMode(source) === 'mock') registerMocks();
  else registerReal(source);

  /*
   * Read back from the registry rather than counting what this call
   * registered. On the second and later calls that count is zero — everything
   * was already there — and treating that as "nobody can pay" would turn a
   * correctly configured deployment into a boot failure on its second request.
   */
  /*
   * Both modes, because a deployment configured for only one of them is
   * normal and correct: production holds sandbox credentials today and will
   * hold live ones later. Nobody can pay only when neither mode has anything.
   */
  if (
    registeredProviders('test').length === 0 &&
    registeredProviders('live').length === 0
  ) {
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

/**
 * Which providers can actually take a payment for one credential mode.
 *
 * The checkout page intersects this with the session's `allowed_providers`,
 * and `createSession` intersects it with what the amount allows. That list was
 * written when the session was created and is what the customer is held to,
 * but a provider in it whose adapter is not registered would render a button
 * that throws — so the intersection, not either list alone, is what gets
 * drawn.
 */
export function availableFor(
  source: ProviderEnv,
  mode: CredentialMode,
): ProviderId[] {
  registerFromEnv(source);

  return registeredProviders(mode);
}

/**
 * `mock` is a deployment-shaped decision and the only value that changes the
 * shape of the registry, so an unrecognised one is refused rather than
 * defaulted. Blank means absent, and absent means `sandbox` — the safe end.
 */
function paymentMode(source: ProviderEnv): 'mock' | 'sandbox' | 'live' {
  const value = set(source.PAYMENT_MODE) ?? 'sandbox';

  if (value !== 'mock' && value !== 'sandbox' && value !== 'live') {
    throw new Error(
      `PAYMENT_MODE=${value} is not one of mock, sandbox or live.`,
    );
  }

  return value;
}

function registerMocks(): void {
  for (const mode of MODES) {
    for (const id of MOCKABLE) {
      registerIfAbsent(new MockProviderAdapter({ id }), mode);
    }
  }
}

/**
 * eSewa's credentials for one mode, or `null` when that mode is not configured.
 *
 * Sandbox reads the `*_SANDBOX_*` pair and falls back to the unprefixed one,
 * which is where every existing deployment's sandbox values already live.
 * Production reads only `*_LIVE_*`: there is no fallback, because the fallback
 * would be a sandbox key signing real payments.
 */
function esewaConfig(source: ProviderEnv, mode: CredentialMode) {
  if (mode === 'live') {
    const merchantCode = set(source.ESEWA_LIVE_MERCHANT_CODE);
    const secretKey = set(source.ESEWA_LIVE_SECRET_KEY);

    return merchantCode && secretKey
      ? { merchantCode, secretKey, env: 'live' as const }
      : null;
  }

  const merchantCode =
    set(source.ESEWA_SANDBOX_MERCHANT_CODE) ?? set(source.ESEWA_MERCHANT_CODE);
  const secretKey =
    set(source.ESEWA_SANDBOX_SECRET_KEY) ?? set(source.ESEWA_SECRET_KEY);
  const baseUrl = set(source.ESEWA_BASE_URL);

  return merchantCode && secretKey
    ? {
        merchantCode,
        secretKey,
        env: 'sandbox' as const,
        ...(baseUrl ? { baseUrl } : {}),
      }
    : null;
}

/** Khalti's, on the same rule. */
function khaltiConfig(source: ProviderEnv, mode: CredentialMode) {
  if (mode === 'live') {
    const secretKey = set(source.KHALTI_LIVE_SECRET_KEY);

    return secretKey ? { secretKey, env: 'live' as const } : null;
  }

  const secretKey =
    set(source.KHALTI_SANDBOX_SECRET_KEY) ?? set(source.KHALTI_SECRET_KEY);
  const baseUrl = set(source.KHALTI_BASE_URL);

  return secretKey
    ? {
        secretKey,
        env: 'sandbox' as const,
        ...(baseUrl ? { baseUrl } : {}),
      }
    : null;
}

/**
 * Real adapters, each one skipped rather than half-built when its credentials
 * are absent.
 *
 * The adapters throw from their own constructors when a credential is missing,
 * so the presence checks here are not a second line of defence — they are what
 * makes "absent" mean *not offered* instead of *offered and broken*.
 */
function registerReal(source: ProviderEnv): void {
  for (const mode of MODES) {
    // Checked as a pair; `lib/env.ts` has already refused a half-configured one.
    const esewa = esewaConfig(source, mode);

    if (esewa && !hasProvider('esewa', mode)) {
      registerProvider(new EsewaProviderAdapter(esewa), mode);
    }

    const khalti = khaltiConfig(source, mode);

    if (khalti && !hasProvider('khalti', mode)) {
      registerProvider(new KhaltiProviderAdapter(khalti), mode);
    }
  }
}
