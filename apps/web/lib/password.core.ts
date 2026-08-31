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
