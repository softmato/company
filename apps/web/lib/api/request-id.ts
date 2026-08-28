import 'server-only';
import { randomBytes } from 'node:crypto';

/**
 * `req_01J...` — the identifier in every error body (docs/API.md §1).
 *
 * A ULID rather than a UUID: it sorts by time, so a SaaS quoting a request id
 * in a support message tells us roughly when it happened before we look
 * anything up. Hand-rolled because a dependency for 20 lines is a maintenance
 * liability for a two-person team (docs/RULES.md §4).
 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(ms: number): string {
  let out = '';
  let value = ms;
  for (let i = 0; i < 10; i++) {
    out = CROCKFORD[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return out;
}

function encodeRandom(): string {
  return Array.from(randomBytes(16))
    .map((byte) => CROCKFORD[byte % 32])
    .join('');
}

export function newRequestId(): string {
  return `req_${encodeTime(Date.now())}${encodeRandom()}`;
}
