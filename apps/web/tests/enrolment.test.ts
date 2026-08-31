import { beforeAll, describe, expect, it } from 'vitest';

import {
  ENROLMENT_TTL_MS,
  claimedAdminId,
  mintEnrolmentToken,
  verifyEnrolmentToken,
  type EnrolmentSubject,
} from '../lib/enrolment/token';
import {
  PENDING_TTL_MS,
  openPendingSecret,
  sealPendingSecret,
} from '../lib/enrolment/pending';

beforeAll(() => {
  process.env.AUTH_SECRET ??= 'a'.repeat(32);
});

/** As `create-admin.mts` writes them: inactive, no secret. */
const pending: EnrolmentSubject = {
  id: 7,
  email: 'new@softmato.com',
  isActive: false,
  totpEnabled: false,
};

/** The same admin once enrolment has completed. */
const enrolled: EnrolmentSubject = {
  ...pending,
  isActive: true,
  totpEnabled: true,
};

describe('enrolment token', () => {
  it('verifies against the subject it was minted for', () => {
    const { token } = mintEnrolmentToken(pending);
    expect(verifyEnrolmentToken(token, pending)).toBe(true);
  });

  /*
   * The single-use property, and the reason there is no tokens table. If this
   * ever fails, an enrolment link has become replayable.
   */
  it('stops verifying once the admin is enrolled', () => {
    const { token } = mintEnrolmentToken(pending);
    expect(verifyEnrolmentToken(token, enrolled)).toBe(false);
  });

  /*
   * The replay this closes: enrol, then deactivate. Deactivation must leave
   * totpEnabled true, giving (false, true) — which is not the (false, false)
   * the original link was signed against.
   */
  it('stays dead after the admin is later deactivated', () => {
    const { token } = mintEnrolmentToken(pending);
    const deactivated = { ...enrolled, isActive: false };
    expect(verifyEnrolmentToken(token, deactivated)).toBe(false);
  });

  /*
   * Defence in depth: `mintEnrolmentToken` signs whatever it is handed, so a
   * token minted against an active admin would otherwise verify and let its
   * holder replace that admin's second factor.
   */
  it('refuses an active subject even with a good signature', () => {
    const { token } = mintEnrolmentToken(enrolled);
    expect(verifyEnrolmentToken(token, enrolled)).toBe(false);
  });

  it('refuses a subject that already has TOTP', () => {
    const halfway = { ...pending, totpEnabled: true };
    const { token } = mintEnrolmentToken(halfway);
    expect(verifyEnrolmentToken(token, halfway)).toBe(false);
  });

  it('does not carry to another admin', () => {
    const { token } = mintEnrolmentToken(pending);
    expect(verifyEnrolmentToken(token, { ...pending, id: 8 })).toBe(false);
  });

  it('does not survive an email change', () => {
    const { token } = mintEnrolmentToken(pending);
    const renamed = { ...pending, email: 'someone.else@softmato.com' };
    expect(verifyEnrolmentToken(token, renamed)).toBe(false);
  });

  it('expires', () => {
    const now = new Date();
    const { token } = mintEnrolmentToken(pending, now);
    const after = new Date(now.getTime() + ENROLMENT_TTL_MS + 1000);

    expect(verifyEnrolmentToken(token, pending, now)).toBe(true);
    expect(verifyEnrolmentToken(token, pending, after)).toBe(false);
  });

  it('rejects a tampered expiry', () => {
    const { token } = mintEnrolmentToken(pending);
    const [id, , sig] = token.split('.');
    const distant = Date.now() + ENROLMENT_TTL_MS * 30;

    expect(verifyEnrolmentToken(`${id}.${distant}.${sig}`, pending)).toBe(false);
  });

  it.each(['', 'nonsense', '7', '7.abc', '..', '7.123'])(
    'fails closed on malformed input %j',
    (token) => {
      expect(verifyEnrolmentToken(token, pending)).toBe(false);
    },
  );

  it('reads the claimed id without trusting it', () => {
    const { token } = mintEnrolmentToken(pending);
    expect(claimedAdminId(token)).toBe(7);
    expect(claimedAdminId('0.1.x')).toBeNull();
    expect(claimedAdminId('-3.1.x')).toBeNull();
    expect(claimedAdminId('nope')).toBeNull();
  });
});

describe('pending secret envelope', () => {
  const encrypted = 'v1.aaaa.bbbb.cccc';

  it('round-trips for the admin it was sealed for', () => {
    const sealed = sealPendingSecret(3, encrypted);
    expect(openPendingSecret(3, sealed)).toBe(encrypted);
  });

  it('does not open for a different admin', () => {
    const sealed = sealPendingSecret(3, encrypted);
    expect(openPendingSecret(4, sealed)).toBeNull();
  });

  /*
   * The property that matters: a caller cannot swap in a secret it chose,
   * because it cannot produce the signature for one.
   */
  it('rejects a substituted secret', () => {
    const sealed = sealPendingSecret(3, encrypted);
    const [expiry, sig] = sealed.split('|');
    const forged = `${expiry}|${sig}|v1.attacker.known.secret`;

    expect(openPendingSecret(3, forged)).toBeNull();
  });

  it('expires', () => {
    const now = new Date();
    const sealed = sealPendingSecret(3, encrypted, now);
    const after = new Date(now.getTime() + PENDING_TTL_MS + 1000);

    expect(openPendingSecret(3, sealed, now)).toBe(encrypted);
    expect(openPendingSecret(3, sealed, after)).toBeNull();
  });

  it.each([undefined, '', 'nope', 'a|b'])(
    'fails closed on malformed input %j',
    (sealed) => {
      expect(openPendingSecret(3, sealed)).toBeNull();
    },
  );
});
