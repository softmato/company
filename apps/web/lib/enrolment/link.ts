/**
 * Where an enrolment token gets sent.
 *
 * No `server-only` marker and no import of `./env`: the bootstrap CLIs print
 * the same link, and `env` throws on any variable the scripts do not set. Read
 * `process.env` directly, exactly as `token.ts` does for `AUTH_SECRET`.
 *
 * The localhost fallback is for `pnpm admin:create` on a fresh checkout. A
 * deployment always has `NEXT_PUBLIC_APP_URL`, because `lib/env.ts` refuses to
 * boot without it.
 */
export function enrolmentUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'http://localhost:3000';

  return `${base}/enrol?token=${encodeURIComponent(token)}`;
}
