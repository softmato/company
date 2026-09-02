/**
 * Reading a gateway's credentials, and refusing to run without them.
 *
 * **The rule this file exists to enforce: a missing credential throws.** It
 * never falls back to a default, a sandbox key, or — worst of the three, and
 * what the adapters did before this — a fabricated successful payment.
 *
 * That last one is not hyperbole. Every adapter carried a branch of the shape
 * `if (!secretKey) return { status: 'succeeded', grossAmountMinor: <exactly
 * what we expected> }`. A result like that satisfies `completePayment`'s
 * amount check, so it posts a journal, clears the invoice and emails the payer
 * a receipt — for money that was never sent. `KHALTI_SECRET_KEY` is empty in
 * `.env.example` today, so that path was one deploy away from live.
 *
 * Faking a payment is a legitimate thing to want in development. It belongs to
 * `MockProviderAdapter` under `PAYMENT_MODE=mock`, where it is the declared
 * purpose of the module rather than a silent consequence of an unset variable.
 * A real adapter with no key is broken, and broken is the honest answer.
 *
 * Hardcoded fallbacks are the same mistake wearing a hat: eSewa's constructor
 * fell back to the literal public sandbox key, so a live deployment missing
 * `ESEWA_SECRET_KEY` would sign real payments with a secret published in
 * eSewa's own documentation, and every signature would verify.
 */
import { PaymentError } from '../errors';
import type { ProviderId } from './types';

export type ProviderEnv = 'sandbox' | 'live';

/**
 * A credential we must have. Absent, blank or whitespace all count as absent —
 * `ESEWA_SECRET_KEY=` in a `.env` file is an unset variable that looks set.
 */
export function requireCredential(
  providerId: ProviderId,
  name: string,
  value: string | undefined | null,
): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      `${providerId} is registered but ${name} is not configured. Set it, or run this provider through MockProviderAdapter with PAYMENT_MODE=mock.`,
      { providerId, missing: name },
    );
  }

  return trimmed;
}

/** `sandbox` unless something explicitly says `live`. Never inferred. */
export function resolveEnv(value: string | undefined): ProviderEnv {
  return value?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox';
}

/**
 * The base URL for a provider, explicit override first.
 *
 * The two hosts are passed in rather than looked up so that a provider's URLs
 * live in that provider's adapter, next to the paths they are joined to.
 * A trailing slash is trimmed because every call site writes its own leading
 * one, and `//epayment/lookup/` is a 404 that reads like a network problem.
 */
export function resolveBaseUrl(
  env: ProviderEnv,
  hosts: Readonly<Record<ProviderEnv, string>>,
  override?: string | undefined,
): string {
  const chosen = override?.trim() || hosts[env];

  return chosen.replace(/\/+$/, '');
}
