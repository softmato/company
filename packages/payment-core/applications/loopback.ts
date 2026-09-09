/**
 * The localhost rule, and why it is asymmetric.
 *
 * ## Why it exists
 *
 * A SaaS being built runs at `http://app.localhost:3000`, and until it ships
 * it has no public hostname and no certificate. `./domains.ts` refuses both
 * halves of that — `http:` is not https, and our own surfaces prove the shape
 * we expect a dev to use (`admin.localhost`, `payment.localhost`, see
 * docs/ENVIRONMENT.md §1). So an integrator could not test the return leg
 * without standing up a local certificate authority first, which is a large
 * amount of yak for a `console.log`.
 *
 * ## The two directions are not the same risk
 *
 * This file used to treat them as one and gate both on the deployment being
 * local. That was over-broad, and it cost an integrator a second deployment
 * they did not need: a Sandbox credential could not send a developer back to
 * their own machine from production, so the whole loop had to be rebuilt
 * locally to test a redirect.
 *
 * **`return_url` is navigated by the customer's browser.** We do not fetch it.
 * A loopback address there resolves on *their* machine, which for a Sandbox
 * credential is the developer's own laptop and is exactly what they asked for.
 * There is nothing to reach and nothing to forge; the worst case is a link
 * that does not open, for the person who typed it. So it is allowed for a
 * Sandbox credential on **any** deployment.
 *
 * **`webhook_url` is fetched by our server.** A loopback address there points
 * at whatever is listening on the machine running this code — on a laptop the
 * developer's dev server, on a deployment *us*. That is the SSRF direction,
 * and it is also useless: our production server cannot reach a laptop, so
 * allowing it would be risk bought with no benefit. It stays gated on the
 * deployment saying it is local.
 *
 * An integrator on localhost therefore gets the redirect and does not get the
 * webhook. That is not a gap to work around: `docs/INTEGRATION.md` §6.4 names
 * a **server-side `getTransaction`** as an equally authoritative answer, and a
 * laptop can make an outbound call perfectly well.
 *
 * ## What still holds in both directions
 *
 *   1. **Sandbox only.** A Production credential has no business pointing at a
 *      loopback address anywhere; the mode is read from the database on the
 *      request that enforces it, never from a form.
 *   2. **Loopback names only.** `localhost` and `*.localhost` — nothing else
 *      widens. Numeric addresses are still refused by the shape check in
 *      `./domains.ts`, which is what keeps `169.254.169.254` out.
 */
import type { CredentialMode } from '@softmato/db';

import { PaymentError } from '../errors';

/**
 * Which destination is being judged.
 *
 * `redirect` is anywhere a customer's browser is sent. `fetch` is anywhere our
 * own server makes a request. The distinction is the whole rule, so it is a
 * parameter rather than something inferred from a field name at each call
 * site — a new caller has to say which kind it is.
 */
export type LoopbackUse = 'redirect' | 'fetch';

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

/**
 * Whether this deployment is a developer's own machine.
 *
 * Read from `process.env` here rather than from the app's parsed env, because
 * `apps/web/lib/env.ts` *defaults* `APP_ENV` to `'local'` and a default is the
 * wrong direction for a gate. An unset variable is `undefined`, which is not
 * `'local'`, so a deployment that never heard of this flag fails closed.
 */
export function isLocalDeployment(): boolean {
  return process.env.APP_ENV === 'local';
}

/**
 * Whether a loopback destination may be used or stored.
 *
 * `use` defaults to `fetch`, the stricter of the two. A caller that has not
 * thought about which direction it is in gets the safe answer.
 */
export function isLoopbackAllowed(
  mode: CredentialMode,
  use: LoopbackUse = 'fetch',
): boolean {
  if (mode !== 'test') return false;

  return use === 'redirect' || isLocalDeployment();
}

/**
 * The same question phrased as a refusal, so every call site produces the same
 * sentence and names the same field.
 *
 * `publicDetail` is safe to send: it describes our own policy and a hostname
 * the caller supplied, which tells an attacker nothing they did not type.
 */
export function assertLoopbackAllowed(
  hostname: string,
  mode: CredentialMode,
  field: string,
  use: LoopbackUse = 'fetch',
): void {
  if (isLoopbackAllowed(mode, use)) return;

  const why =
    mode !== 'test'
      ? 'it belongs to a Production credential'
      : 'this deployment is not a local one, and we would be fetching it';

  const publicDetail =
    mode !== 'test'
      ? `${field} points at "${hostname}". Loopback addresses are accepted only for a Sandbox credential.`
      : `${field} points at "${hostname}". A loopback address is accepted as a redirect target, but not as one we call — we cannot reach your machine. Use a server-side transaction read instead (docs/INTEGRATION.md §6.4), or give us a public hostname.`;

  throw new PaymentError(
    'VALIDATION_FAILED',
    `${field} points at the loopback address "${hostname}", and ${why}`,
    { field, hostname, mode, use },
    publicDetail,
  );
}
