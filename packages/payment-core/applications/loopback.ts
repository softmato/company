/**
 * The development escape hatch, and the three conditions that keep it one.
 *
 * ## Why it exists
 *
 * A SaaS being built runs at `http://app.localhost:3000`, and until it ships
 * it has no public hostname and no certificate. `./domains.ts` refuses both
 * halves of that — `http:` is not https, and our own surfaces prove the shape
 * we expect a dev to use (`admin.localhost`, `payment.localhost`, see
 * docs/ENVIRONMENT.md §1). So an integrator could not test the return leg or
 * receive a webhook without standing up a local certificate authority first,
 * which is a large amount of yak for a `console.log`.
 *
 * ## Why it is not a hole
 *
 * The dangerous direction is `webhook_url`, because **our server** fetches it.
 * A loopback address there points at whatever is listening on the machine
 * running this code — on a laptop that is the developer's own dev server, and
 * on a deployment it is us. Those are not the same act, so the deployment
 * decides, not the caller and not the row:
 *
 *   1. **`APP_ENV=local`.** Read from `process.env` here rather than from the
 *      app's parsed env, because `apps/web/lib/env.ts` *defaults* `APP_ENV` to
 *      `'local'` and a default is the wrong direction for a gate. An unset
 *      variable is `undefined`, which is not `'local'`, so a deployment that
 *      never heard of this flag has the hatch shut. Fail closed by omission.
 *   2. **Sandbox only.** A Production credential has no business pointing at a
 *      loopback address even on a laptop; the mode is read from the database
 *      on the request that enforces it, never from a form.
 *   3. **Loopback names only.** `localhost` and `*.localhost` — nothing else
 *      widens. Numeric addresses are still refused by the shape check in
 *      `./domains.ts`, which is what keeps `169.254.169.254` out.
 *
 * Note that this file is a net *tightening* of production. `app.localhost`
 * already satisfied both the `https:` rule and the `hostname_is_bare_lowercase`
 * check constraint, so a Production webhook could be aimed at our own loopback
 * and nothing said no. Now something does.
 */
import type { CredentialMode } from '@softmato/db';

import { PaymentError } from '../errors';

/**
 * `localhost` and every name under it.
 *
 * Browsers resolve `*.localhost` to 127.0.0.1 with no hosts-file entry, which
 * is why this project already addresses its own four surfaces that way. Bare
 * `localhost` is matched here for completeness — it cannot reach the database,
 * because `application_domains.hostname` requires at least two dot-separated
 * labels — so a dev registers `app.localhost`, not `localhost`.
 */
export function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

/** Condition 1. Explicitly set, never defaulted. See the note above. */
export function isLocalDeployment(): boolean {
  return process.env.APP_ENV === 'local';
}

/**
 * Whether a loopback destination may be *written* at all, before any credential
 * exists to hang it off. The mode is supplied by the caller here because
 * `registerApplication` mints its credential and its domains in one
 * transaction — there is no row to read the mode from yet.
 */
export function isLoopbackAllowed(mode: CredentialMode): boolean {
  return isLocalDeployment() && mode === 'test';
}

/**
 * The same question, phrased as a refusal, so every call site produces the same
 * sentence and names the same field.
 *
 * `publicDetail` is safe to send: it describes our own policy and a hostname
 * the caller supplied, which tells an attacker nothing they did not type.
 */
export function assertLoopbackAllowed(
  hostname: string,
  mode: CredentialMode,
  field: string,
): void {
  if (isLoopbackAllowed(mode)) return;

  const why = !isLocalDeployment()
    ? 'this deployment is not a local one'
    : 'it belongs to a Production credential';

  throw new PaymentError(
    'VALIDATION_FAILED',
    `${field} points at the loopback address "${hostname}", and ${why}`,
    { field, hostname, mode },
    `${field} points at "${hostname}". Loopback addresses are accepted only by a local development deployment, and only for a Sandbox credential.`,
  );
}
