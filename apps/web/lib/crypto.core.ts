/**
 * AES-256-GCM and timing-safe comparison.
 *
 * This module deliberately has no `server-only` marker and no import of
 * `./env`, so the admin bootstrap CLI can use exactly the same implementation
 * the application does. Two copies of an encryption format is how a key
 * rotation ends up unable to read half the rows.
 *
 * Application code imports `./crypto`, which re-exports this behind the
 * `server-only` guard. Nothing should import this file from a component.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits, the GCM standard

/** Read lazily so importing this module never throws at load time. */
function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;

  if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      'ENCRYPTION_KEY must be 32 bytes of hex (64 characters). See docs/ENVIRONMENT.md §2.',
    );
  }

  return Buffer.from(raw, 'hex');
}

/**
 * A deterministic 32 bytes derived from `ENCRYPTION_KEY` and `info`.
 *
 * For secondary secrets that must come out the same every time they are
 * computed rather than being stored between computations. `info` is the domain
 * separator: two callers with different labels can never derive the same
 * bytes, so one use of this cannot be replayed against another.
 *
 * Keyed on `ENCRYPTION_KEY` and not `AUTH_SECRET` on purpose. Anything derived
 * here is of the same kind as the secrets this module encrypts, so it must sit
 * behind the same key — deriving a second factor from the session secret would
 * mean one leak costs both.
 */
export function deriveFromKey(info: string): Buffer {
  return createHmac('sha256', key()).update(info).digest();
}

/**
 * Returns `v1.<iv>.<authTag>.<ciphertext>`, all base64url.
 *
 * The version prefix is what makes key rotation possible later without
 * guessing at the format of existing rows.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptSecret(encoded: string): string {
  const [version, ivPart, tagPart, dataPart] = encoded.split('.');

  if (version !== 'v1' || !ivPart || !tagPart || !dataPart) {
    throw new Error('Malformed encrypted secret');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key(),
    Buffer.from(ivPart, 'base64url'),
  );
  // Set before final(): the auth tag is what makes this tamper-evident.
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Constant-time string comparison. Never `===` on a secret or signature.
 *
 * Length differences leak through `timingSafeEqual`, which throws on mismatched
 * buffers — so the length check is done without an early return that would be
 * observable in the timing.
 */
export function timingSafeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
