/**
 * Vercel's REST API, called as Softmato's team with `VERCEL_API_TOKEN`.
 * Callers check `vercelConfigured()` first; without a token there is nothing
 * to call, and every feature built on this is off rather than broken.
 */
import 'server-only';

import { env } from '@/lib/env';

export function vercelConfigured(): boolean {
  return Boolean(env.VERCEL_API_TOKEN);
}

export function vercelFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = new URL(`https://api.vercel.com${path}`);
  if (env.VERCEL_TEAM_ID) url.searchParams.set('teamId', env.VERCEL_TEAM_ID);

  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
}
