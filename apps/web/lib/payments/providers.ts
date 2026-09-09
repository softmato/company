/**
 * The composition root for payment providers, bound to this deployment's
 * validated environment.
 *
 * The policy itself — which adapter exists for which mode, and what counts as
 * a configured credential — lives in `./providers.core`, because a script that
 * calls `createSession` needs the same answer and cannot import a
 * `server-only` module. Everything here is the binding and the diagnostics.
 */
import 'server-only';

import { registeredProviders, type ProviderId } from '@softmato/payment-core';

import type { CredentialMode } from '@softmato/db';

import { env } from '@/lib/env';
import { availableFor, registerFromEnv } from '@/lib/payments/providers.core';

/**
 * Registers every enabled adapter. Safe to call on every request.
 *
 * Next imports this from several entry points — a page, a server action, an
 * API route, a cron route — and any of them may be the first to run.
 */
export function ensureProvidersRegistered(): void {
  registerFromEnv(env);
}

/**
 * Which providers can actually take a payment right now, for one credential
 * mode.
 */
export function availableProviders(mode: CredentialMode): ProviderId[] {
  const available = availableFor(env, mode);

  if (available.length === 0) warnModeUnserviceable(mode);

  return available;
}

/**
 * Says out loud that this deployment cannot serve one of its two modes.
 *
 * `registerFromEnv` throws only when *both* modes are empty, and that
 * asymmetry is deliberate — a deployment holding sandbox credentials and no
 * live ones is the normal state of this product today, and refusing to boot
 * over it would be wrong. The cost is that the *other* half of that asymmetry
 * used to be completely silent: a deployment that registered only `live`
 * adapters served every `cs_test_` session a checkout page reading "No payment
 * method is available", with nothing in the logs, nothing thrown, and every
 * credential present and correct in the dashboard.
 *
 * A blank page and a blank log is the worst pairing available, so the one fact
 * that explains it gets written down. It is a warning rather than a throw
 * because the caller has an honest page to render, and a 500 tells the
 * customer less than the notice does.
 */
function warnModeUnserviceable(mode: CredentialMode): void {
  const other: CredentialMode = mode === 'test' ? 'live' : 'test';
  const vars =
    mode === 'live'
      ? 'ESEWA_LIVE_MERCHANT_CODE + ESEWA_LIVE_SECRET_KEY, or KHALTI_LIVE_SECRET_KEY'
      : 'ESEWA_MERCHANT_CODE + ESEWA_SECRET_KEY (or their *_SANDBOX_* forms), or KHALTI_SECRET_KEY';

  console.warn(
    `[payments] No adapter is registered for ${mode}, so no ${mode} session ` +
      `can be paid on this deployment. ${registeredProviders(other).length} ` +
      `adapter(s) are registered for ${other}, which is why this did not fail ` +
      `at boot. Set ${vars} — and note that setting one of them blank is the ` +
      'same as not setting it.',
  );
}
