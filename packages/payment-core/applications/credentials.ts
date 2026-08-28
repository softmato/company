/**
 * API credentials for the SaaS products that call `/api/v1` (docs/API.md §2).
 *
 * The one design constraint that shapes everything here: a request carries
 * `Authorization: Bearer <client_secret>` and nothing else — no client id
 * header. Since the secret is stored as an argon2id hash, and argon2 salts
 * every hash, the secret cannot be looked up by hashing it. So the secret has
 * to say which application it belongs to.
 *
 *   client_id      app_live_hostelhub_7fk2m9qzx4
 *   client_secret  sk_live_hostelhub_7fk2m9qzx4.<43 characters of CSPRNG>
 *
 * The part before the dot is the client id with its prefix swapped, so the
 * lookup is a plain unique-index hit and the argon2 verify then proves the
 * bearer actually holds the secret. A leaked secret naming its own application
 * is not a weakness — the entropy after the dot is the secret, and knowing
 * which door a key opens does not help you cut the key.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';

/** OWASP-recommended argon2id parameters: 19 MiB, 2 iterations, 1 lane. */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const CLIENT_ID_PREFIX = 'app_';
const SECRET_PREFIX = 'sk_';
const HANDLE_BYTES = 8;
const SECRET_BYTES = 32;

/** Lowercase base32-ish alphabet: no vowels, so no handle spells anything. */
const HANDLE_ALPHABET = '0123456789bcdfghjkmnpqrstvwxyz';

function randomHandle(): string {
  // Rejection-free because 30 divides evenly enough for a non-cryptographic
  // identifier; the secrecy lives entirely in the 32 bytes after the dot.
  return Array.from(randomBytes(HANDLE_BYTES))
    .map((byte) => HANDLE_ALPHABET[byte % HANDLE_ALPHABET.length])
    .join('');
}

/**
 * `app_live_hostelhub_7fk2m9qz`. The product id is in there so an admin
 * reading a log line knows whose credential it is without a query.
 */
export function generateClientId(productId: string, isLive: boolean): string {
  return `${CLIENT_ID_PREFIX}${isLive ? 'live' : 'test'}_${productId}_${randomHandle()}`;
}

export interface IssuedSecret {
  /** Shown once, at issue, and never again (docs/API.md §2). */
  secret: string;
  secretHash: string;
  secretLast4: string;
}

export async function issueSecret(clientId: string): Promise<IssuedSecret> {
  const handle = clientId.slice(CLIENT_ID_PREFIX.length);
  const entropy = randomBytes(SECRET_BYTES).toString('base64url');
  const secret = `${SECRET_PREFIX}${handle}.${entropy}`;

  return {
    secret,
    secretHash: await argon2Hash(secret, ARGON2),
    secretLast4: secret.slice(-4),
  };
}

/**
 * Recovers the client id a bearer token claims to belong to. Claims only —
 * nothing is authenticated until the hash verifies.
 *
 * Returns null for anything malformed, so a junk Authorization header costs
 * one string operation rather than a database round trip.
 */
export function clientIdFromSecret(secret: string): string | null {
  if (!secret.startsWith(SECRET_PREFIX)) return null;

  const dot = secret.indexOf('.');
  if (dot < 0) return null;

  const handle = secret.slice(SECRET_PREFIX.length, dot);
  const entropy = secret.slice(dot + 1);

  if (!/^(live|test)_[a-z0-9-]+_[a-z0-9]+$/.test(handle)) return null;
  if (entropy.length < 32 || !/^[A-Za-z0-9_-]+$/.test(entropy)) return null;

  return `${CLIENT_ID_PREFIX}${handle}`;
}

/**
 * argon2 verification is already constant-time in the comparison that matters.
 * The `catch` exists because a malformed stored hash throws rather than
 * returning false, and a throw on a money path must not read as success.
 */
export async function verifySecret(
  storedHash: string,
  presented: string,
): Promise<boolean> {
  return argon2Verify(storedHash, presented).catch(() => false);
}

/** For comparing anything that is not a hash — a webhook secret, a token. */
export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export { ARGON2 as ARGON2_PARAMS };
