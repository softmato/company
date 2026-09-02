import { beforeAll, describe, expect, it } from 'vitest';

import {
  ENROLMENT_TTL_MS,
  claimedAdminId,
  mintEnrolmentToken,
  verifyEnrolmentToken,
  type EnrolmentSubject,
} from '../lib/enrolment/token';
import { enrolmentSecret, rotationSecret } from '../lib/enrolment/secret';
import { encryptSecret } from '../lib/crypto.core';
import { enrolmentUri, verifyTotp } from '../lib/totp.core';

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

    expect(verifyEnrolmentToken(`${id}.${distant}.${sig}`, pending)).toBe(
      false,
    );
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

/**
 * The property the enrolment page depends on: `/enrol` re-renders on every
 * request to that URL, and a phone that leaves the tab to open an
 * authenticator app routinely comes back to a fresh render. If the secret
 * moved with the render, the QR just scanned would stop being the one the form
 * checks — which presented as "the link expired within a minute".
 */
describe('enrolmentSecret', () => {
  const token = mintEnrolmentToken(pending, new Date()).token;

  it('is the same on every derivation from one token', () => {
    expect(enrolmentSecret(token)).toBe(enrolmentSecret(token));
  });

  it('is a 160-bit base32 secret', () => {
    expect(enrolmentSecret(token)).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('differs between tokens', () => {
    const other = mintEnrolmentToken({ ...pending, id: 8 }, new Date()).token;

    expect(enrolmentSecret(token)).not.toBe(enrolmentSecret(other));
  });

  it('re-issuing rotates the secret', () => {
    const now = new Date();
    const later = new Date(now.getTime() + 1000);

    expect(enrolmentSecret(mintEnrolmentToken(pending, now).token)).not.toBe(
      enrolmentSecret(mintEnrolmentToken(pending, later).token),
    );
  });

  /*
   * End to end over the two halves that never meet: the page builds a URI for
   * an authenticator, the action re-derives and encrypts. A code from the
   * first has to clear the second, or enrolment cannot complete at all.
   */
  it('produces a secret the confirm step accepts', async () => {
    const secret = enrolmentSecret(token);
    const uri = enrolmentUri(secret, pending.email);
    const { URI } = await import('otpauth');
    const code = (URI.parse(uri) as { generate: () => string }).generate();

    expect(verifyTotp(encryptSecret(secret), code)).toBe(true);
  });
});

/**
 * Rotation's candidate is bound to the secret it would replace, which is what
 * makes it survive a failed attempt re-rendering the page and stop existing
 * once the rotation commits.
 */
describe('rotationSecret', () => {
  const current = encryptSecret('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');

  it('is the same on every derivation while the secret stands', () => {
    expect(rotationSecret(3, current)).toBe(rotationSecret(3, current));
  });

  it('is a 160-bit base32 secret', () => {
    expect(rotationSecret(3, current)).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('differs between admins holding the same secret', () => {
    expect(rotationSecret(3, current)).not.toBe(rotationSecret(4, current));
  });

  it('stops deriving once the secret it replaces is gone', () => {
    const replaced = encryptSecret(rotationSecret(3, current));

    expect(rotationSecret(3, replaced)).not.toBe(rotationSecret(3, current));
  });

  /* Distinct domain separators: neither act can be replayed against the other. */
  it('never collides with an enrolment secret', () => {
    expect(rotationSecret(3, current)).not.toBe(enrolmentSecret(current));
  });
});
