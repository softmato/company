import { describe, expect, it } from 'vitest';

import { PaymentError } from '../errors';
import {
  requireCredential,
  resolveBaseUrl,
  resolveEnv,
} from '../providers/credentials';

describe('requireCredential', () => {
  it('returns the trimmed value when it is present', () => {
    expect(requireCredential('esewa', 'ESEWA_SECRET_KEY', '  abc  ')).toBe(
      'abc',
    );
  });

  /**
   * The single most important assertion in this package.
   *
   * Every adapter used to answer a missing secret key with a *successful
   * payment for the exact expected amount*. That result satisfies
   * `completePayment`'s amount comparison, so it posted a journal entry,
   * cleared the invoice and emailed a receipt — for money nobody sent.
   * `KHALTI_SECRET_KEY` is empty in `.env.example`, so it was one deploy from
   * live.
   */
  it('throws when the credential is absent, blank or whitespace', () => {
    for (const missing of [undefined, null, '', '   ']) {
      expect(() =>
        requireCredential('khalti', 'KHALTI_SECRET_KEY', missing),
      ).toThrow(PaymentError);
    }
  });

  it('names the missing variable so the log says what to set', () => {
    try {
      requireCredential('khalti', 'KHALTI_SECRET_KEY', '');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as PaymentError).context?.missing).toBe(
        'KHALTI_SECRET_KEY',
      );
      expect((error as PaymentError).message).toContain('PAYMENT_MODE=mock');
    }
  });
});

describe('resolveEnv', () => {
  it('is live only when something says so explicitly', () => {
    expect(resolveEnv('live')).toBe('live');
    expect(resolveEnv('  LIVE ')).toBe('live');
  });

  it('defaults to sandbox for everything else', () => {
    for (const value of [undefined, '', 'sandbox', 'production', 'true']) {
      expect(resolveEnv(value)).toBe('sandbox');
    }
  });
});

describe('resolveBaseUrl', () => {
  const hosts = {
    sandbox: 'https://rc-epay.esewa.com.np',
    live: 'https://epay.esewa.com.np',
  } as const;

  it('picks the host for the environment', () => {
    expect(resolveBaseUrl('sandbox', hosts)).toBe(
      'https://rc-epay.esewa.com.np',
    );
    expect(resolveBaseUrl('live', hosts)).toBe('https://epay.esewa.com.np');
  });

  it('lets an explicit override win', () => {
    expect(resolveBaseUrl('live', hosts, 'https://example.test')).toBe(
      'https://example.test',
    );
  });

  it('trims a trailing slash, because every path adds its own', () => {
    expect(resolveBaseUrl('live', hosts, 'https://example.test/')).toBe(
      'https://example.test',
    );
  });
});
