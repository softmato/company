/**
 * Password hashing and the length rule, in one place.
 *
 * No `server-only` marker and no import of `./env`, for the same reason as
 * `crypto.core.ts`: the admin bootstrap CLI shares this implementation. Two
 * copies of the argon2 parameters is how an account created by the script ends
 * up unverifiable by the application.
 */
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';

/**
 * OWASP-recommended argon2id parameters: 19 MiB, 2 iterations, 1 lane.
 *
 * Changing these does not invalidate existing hashes — the cost parameters are
 * encoded in the hash string itself, so `verify` keeps working against
 * passwords hashed under the old settings.
 */
const ARGON2 = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * 12 characters everywhere that matters. Local development may use something
 * shorter — a throwaway password on a throwaway database is a convenience, not
 * a risk — but the exception is scoped to APP_ENV=local so it cannot follow an
 * account into preview or production.
 */
export function passwordMinLength(): number {
  return process.env.APP_ENV === 'local' ? 8 : 12;
}

/**
 * A dummy argon2id hash of a random value. Verifying against it when no user
 * exists keeps the response time of "unknown email" indistinguishable from
 * "wrong password", so a sign-in form cannot be used to enumerate accounts.
 * Shared by the admin and the client portal sign-ins.
 */
export const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29mdG1hdG9kdW1teXNhbHQ$3S8xdOkQ3xW5xk1Jm0GhIfJmXWJ3Xk1XZ0YQ0Zx2Xk0';

export function hashPassword(plaintext: string): Promise<string> {
  return argon2Hash(plaintext, ARGON2);
}

/** Never throws: a malformed stored hash is "not authenticated", not a 500. */
export function verifyPassword(
  hash: string,
  plaintext: string,
): Promise<boolean> {
  return argon2Verify(hash, plaintext).catch(() => false);
}
