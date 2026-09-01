/**
 * TOTP secrets are encrypted at rest with ENCRYPTION_KEY (docs/RULES.md §6).
 * These tests cover the properties that matter: round-tripping, tamper
 * detection, and that comparison of secrets is not a plain `===`.
 */
import { describe, expect, test } from 'vitest';
import { Secret, TOTP } from 'otpauth';

import {
  decryptSecret,
  encryptSecret,
  timingSafeEquals,
} from '@/lib/crypto.core';
import { checkTotp, createTotpEnrolment, verifyTotp } from '@/lib/totp.core';

describe('encryption at rest', () => {
  test('a secret round-trips', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP';
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  test('the same plaintext encrypts differently every time', () => {
    // A fresh IV per encryption — identical ciphertexts would leak that two
    // users share a secret.
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  test('a tampered ciphertext is rejected, not silently decrypted', () => {
    const encoded = encryptSecret('JBSWY3DPEHPK3PXP');
    const [version, iv, tag, data] = encoded.split('.');
    const flipped = `${data!.slice(0, -2)}${data!.endsWith('AA') ? 'BB' : 'AA'}`;

    expect(() =>
      decryptSecret([version, iv, tag, flipped].join('.')),
    ).toThrow();
  });

  test('a malformed payload is rejected', () => {
    expect(() => decryptSecret('not-encrypted')).toThrow(/Malformed/);
    expect(() => decryptSecret('v2.a.b.c')).toThrow(/Malformed/);
  });
});

describe('timing-safe comparison', () => {
  test('equal strings compare true', () => {
    expect(timingSafeEquals('sk_live_abc', 'sk_live_abc')).toBe(true);
  });

  test('different strings of equal length compare false', () => {
    expect(timingSafeEquals('sk_live_abc', 'sk_live_abd')).toBe(false);
  });

  test('different lengths compare false without throwing', () => {
    expect(timingSafeEquals('short', 'much longer value')).toBe(false);
  });
});

describe('TOTP', () => {
  test('enrolment stores an encrypted secret, never the plaintext', () => {
    const enrolment = createTotpEnrolment('founder@example.com');

    expect(enrolment.encryptedSecret.startsWith('v1.')).toBe(true);
    // The base32 secret appears in the URI the user scans, but must not be
    // recoverable from the stored column without the key.
    const plaintext = decryptSecret(enrolment.encryptedSecret);
    expect(enrolment.encryptedSecret).not.toContain(plaintext);
  });

  test('a current code verifies', () => {
    const enrolment = createTotpEnrolment('founder@example.com');
    const code = new URL(
      enrolment.otpauthUri.replace('otpauth://', 'https://'),
    );
    const secret = code.searchParams.get('secret')!;

    // Derive the expected code the same way an authenticator app would.
    const generated = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    }).generate();

    expect(verifyTotp(enrolment.encryptedSecret, generated)).toBe(true);
  });

  test('a wrong code fails', () => {
    const enrolment = createTotpEnrolment('founder@example.com');
    expect(verifyTotp(enrolment.encryptedSecret, '000000')).toBe(false);
  });

  test('a malformed code fails without throwing', () => {
    const enrolment = createTotpEnrolment('founder@example.com');
    expect(verifyTotp(enrolment.encryptedSecret, 'abcdef')).toBe(false);
    expect(verifyTotp(enrolment.encryptedSecret, '')).toBe(false);
  });

  test('verification fails closed on an undecryptable secret', () => {
    expect(verifyTotp('v1.aaa.bbb.ccc', '123456')).toBe(false);
  });
});

/**
 * The distinction that matters operationally: a secret encrypted under a
 * different ENCRYPTION_KEY is not a wrong code, and a deployment that reports
 * it as one sends its operator looking at their phone instead of their
 * environment variables. That mistake has already cost one production
 * debugging session.
 */
describe('why a code was refused', () => {
  test('a valid code is ok', () => {
    const enrolment = createTotpEnrolment('founder@example.com');
    const secret = decryptSecret(enrolment.encryptedSecret);

    const generated = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    }).generate();

    expect(checkTotp(enrolment.encryptedSecret, generated)).toBe('ok');
  });

  test('a wrong code is invalid, not unreadable', () => {
    const enrolment = createTotpEnrolment('founder@example.com');
    expect(checkTotp(enrolment.encryptedSecret, '000000')).toBe('invalid');
  });

  test('a secret from a different key is unreadable, not invalid', () => {
    const enrolment = createTotpEnrolment('founder@example.com');
    const original = process.env.ENCRYPTION_KEY;

    try {
      process.env.ENCRYPTION_KEY = 'f'.repeat(64);
      expect(checkTotp(enrolment.encryptedSecret, '000000')).toBe('unreadable');
    } finally {
      process.env.ENCRYPTION_KEY = original;
    }
  });

  test('verifyTotp still answers a plain boolean', () => {
    const enrolment = createTotpEnrolment('founder@example.com');
    expect(verifyTotp(enrolment.encryptedSecret, '000000')).toBe(false);
  });
});
