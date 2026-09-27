/**
 * GitHub's `deployment_status` webhook: did it come from GitHub, and is it a
 * production deploy that just went live. Pure — the route acts on it.
 *
 * Vercel reports every deploy to GitHub as a deployment status, so one
 * webhook on the GitHub organisation (free on any plan) hears about every
 * client site. GitHub signs the raw body, HMAC-SHA256 in hex, in
 * `X-Hub-Signature-256` as `sha256=<hex>`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export function verifyGithubSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const expected = Buffer.from(
    `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`,
  );
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Vercel names the environment "Production", or "Production – <project>"
 * when one repository feeds several projects. Previews are ignored here,
 * before any call to Vercel.
 */
const productionSuccess = z.object({
  deployment_status: z.object({ state: z.literal('success') }),
  deployment: z.object({
    sha: z.string().regex(/^[0-9a-f]{40}$/),
    environment: z.string().regex(/^production/i),
  }),
});

export function productionSha(event: unknown): string | null {
  const parsed = productionSuccess.safeParse(event);
  return parsed.success ? parsed.data.deployment.sha : null;
}
