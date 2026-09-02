import { describe, expect, it } from 'vitest';

import {
  normalizeHostname,
  normalizeHostnameInput,
} from '../applications/domains';

/**
 * The allowlist is only as good as the function that decides what a URL's
 * hostname *is*. Everything below is a way someone has historically got a
 * "matching" host past a check that looked correct.
 */
describe('normalizeHostname', () => {
  it('reduces a URL to its bare host', () => {
    expect(normalizeHostname('https://questioncall.com/pay?x=1#frag')).toBe(
      'questioncall.com',
    );
  });

  it('lowercases, so a shouted host is the same row', () => {
    expect(normalizeHostname('https://QuestionCall.COM')).toBe(
      'questioncall.com',
    );
  });

  it('drops the port, which is not part of identity here', () => {
    expect(normalizeHostname('https://questioncall.com:8443/x')).toBe(
      'questioncall.com',
    );
  });

  /**
   * `questioncall.com.` and `questioncall.com` resolve to the same host. Two
   * rows for one host is one row an admin can revoke while the other keeps
   * working.
   */
  it('strips the trailing dot of a fully qualified name', () => {
    expect(normalizeHostname('https://questioncall.com./')).toBe(
      'questioncall.com',
    );
  });

  /**
   * The homograph case. `quеstioncall.com` carries a Cyrillic е and is a
   * different domain that renders identically. `new URL()` folds it to
   * punycode, so the comparison is `xn--` against ASCII and cannot collide.
   */
  it('folds an internationalised host to punycode before it is compared', () => {
    const host = normalizeHostname('https://quеstioncall.com');

    expect(host).not.toBe('questioncall.com');
    expect(host).toMatch(/^xn--/);
  });

  it('refuses anything that is not https', () => {
    expect(normalizeHostname('http://questioncall.com')).toBeNull();
    expect(normalizeHostname('javascript:alert(1)')).toBeNull();
    expect(normalizeHostname('data:text/html,<script>')).toBeNull();
    expect(normalizeHostname('file:///etc/passwd')).toBeNull();
  });

  it('refuses a relative or malformed URL', () => {
    expect(normalizeHostname('/pay')).toBeNull();
    expect(normalizeHostname('questioncall.com')).toBeNull();
    expect(normalizeHostname('')).toBeNull();
  });

  /**
   * The SSRF shapes. A webhook aimed at a numeric or single-label address is
   * the case the destination restriction exists for, and it must not even
   * reach a lookup.
   */
  it('refuses addresses with no dotted labels — the SSRF shapes', () => {
    expect(normalizeHostname('https://localhost')).toBeNull();
    expect(
      normalizeHostname('https://169.254.169.254/latest/meta-data/'),
    ).toBeNull();
    expect(normalizeHostname('https://127.0.0.1')).toBeNull();
    expect(normalizeHostname('https://[::1]/')).toBeNull();
    expect(normalizeHostname('https://metadata/')).toBeNull();
  });

  /**
   * Userinfo is the classic confusion: a reader sees `questioncall.com` first
   * and stops. The host is `evil.com`, and this must report that.
   */
  it('reports the real host when userinfo is used to disguise it', () => {
    expect(normalizeHostname('https://questioncall.com@evil.com/pay')).toBe(
      'evil.com',
    );
  });
});

describe('normalizeHostnameInput', () => {
  it('accepts what an admin actually types', () => {
    expect(normalizeHostnameInput('questioncall.com')).toBe('questioncall.com');
    expect(normalizeHostnameInput('  App.QuestionCall.com ')).toBe(
      'app.questioncall.com',
    );
  });

  /**
   * Refused rather than trimmed. Quietly turning `https://evil.com/path` into
   * `evil.com` would hide that the admin pasted the wrong thing.
   */
  it('refuses a scheme, port or path instead of stripping them', () => {
    expect(normalizeHostnameInput('https://questioncall.com')).toBeNull();
    expect(normalizeHostnameInput('questioncall.com/pay')).toBeNull();
    expect(normalizeHostnameInput('questioncall.com:443')).toBeNull();
  });

  it('refuses wildcards', () => {
    expect(normalizeHostnameInput('*.questioncall.com')).toBeNull();
    expect(normalizeHostnameInput('*')).toBeNull();
  });

  it('refuses empty and single-label input', () => {
    expect(normalizeHostnameInput('')).toBeNull();
    expect(normalizeHostnameInput('   ')).toBeNull();
    expect(normalizeHostnameInput('localhost')).toBeNull();
  });
});

/**
 * The bug this whole module exists to make unwritable. `assertRegisteredHost`
 * compares with SQL equality, so this is a guard on the idea rather than on
 * the code path: if anyone ever reaches for `endsWith`, this is what it does.
 */
describe('the suffix-match bypass', () => {
  it('a suffix match would accept a lookalike domain; equality does not', () => {
    const registered = 'questioncall.com';
    const attacker = normalizeHostname('https://evilquestioncall.com/pay');

    expect(attacker).toBe('evilquestioncall.com');
    expect(attacker!.endsWith(registered)).toBe(true);
    expect(attacker === registered).toBe(false);
  });

  it('a subdomain is a different host and needs its own row', () => {
    expect(normalizeHostname('https://app.questioncall.com')).toBe(
      'app.questioncall.com',
    );
    expect(normalizeHostname('https://app.questioncall.com')).not.toBe(
      'questioncall.com',
    );
  });
});
