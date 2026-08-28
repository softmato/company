import { describe, expect, it } from 'vitest';

import {
  clientIdFromSecret,
  constantTimeEquals,
  generateClientId,
  issueSecret,
  verifySecret,
} from '../applications/credentials';

describe('client ids', () => {
  it('names the product and the mode', () => {
    expect(generateClientId('hostelhub', true)).toMatch(
      /^app_live_hostelhub_[0-9bcdfghjkmnpqrstvwxyz]{8}$/,
    );
    expect(generateClientId('questioncall', false)).toMatch(
      /^app_test_questioncall_[0-9bcdfghjkmnpqrstvwxyz]{8}$/,
    );
  });

  it('does not repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateClientId('hostelhub', true));
    expect(seen.size).toBe(500);
  });
});

describe('client secrets', () => {
  it('carries the client id it belongs to', async () => {
    const clientId = generateClientId('hostelhub', true);
    const { secret } = await issueSecret(clientId);

    expect(secret.startsWith('sk_live_hostelhub_')).toBe(true);
    expect(clientIdFromSecret(secret)).toBe(clientId);
  });

  it('verifies only against its own hash', async () => {
    const clientId = generateClientId('hostelhub', false);
    const issued = await issueSecret(clientId);
    const other = await issueSecret(clientId);

    expect(await verifySecret(issued.secretHash, issued.secret)).toBe(true);
    expect(await verifySecret(issued.secretHash, other.secret)).toBe(false);
  });

  it('stores a hash, never the secret', async () => {
    const { secret, secretHash } = await issueSecret(
      generateClientId('hostelhub', true),
    );

    expect(secretHash.startsWith('$argon2id$')).toBe(true);
    expect(secretHash).not.toContain(secret.split('.')[1]);
  });

  it('records only the last four characters for display', async () => {
    const { secret, secretLast4 } = await issueSecret(
      generateClientId('hostelhub', true),
    );
    expect(secret.endsWith(secretLast4)).toBe(true);
    expect(secretLast4).toHaveLength(4);
  });

  it('returns false rather than throwing on a malformed stored hash', async () => {
    expect(await verifySecret('not-a-hash', 'anything')).toBe(false);
  });
});

describe('rejecting junk before a database round trip', () => {
  it.each([
    ['empty', ''],
    ['no prefix', 'hostelhub.abcdefghijklmnopqrstuvwxyz0123456789abcd'],
    ['no dot', 'sk_live_hostelhub_7fk2m9qz'],
    ['too little entropy', 'sk_live_hostelhub_7fk2m9qz.short'],
    ['bad mode', 'sk_prod_hostelhub_7fk2m9qz.abcdefghijklmnopqrstuvwxyz0123456789'],
    ['sql-ish', "sk_live_x' OR 1=1--_7fk2m9qz.abcdefghijklmnopqrstuvwxyz01234567"],
    ['padding characters', 'sk_live_hostelhub_7fk2m9qz.abcdefghijklmnopqrstuvwxyz0123456789+/='],
  ])('rejects %s', (_name, value) => {
    expect(clientIdFromSecret(value)).toBeNull();
  });
});

describe('constantTimeEquals', () => {
  it('compares equal strings', () => {
    expect(constantTimeEquals('abc123', 'abc123')).toBe(true);
  });

  it('rejects different strings of the same length', () => {
    expect(constantTimeEquals('abc123', 'abc124')).toBe(false);
  });

  it('rejects different lengths without throwing', () => {
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
  });
});
