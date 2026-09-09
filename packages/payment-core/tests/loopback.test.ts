import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { normalizeHostname } from '../applications/domains';
import {
  assertLoopbackAllowed,
  isLoopbackAllowed,
  isLoopbackHostname,
} from '../applications/loopback';

/**
 * The development escape hatch. Every test here is really the same question
 * asked from a different direction: can a caller, a stored row, or a
 * misconfigured deployment get `http://` or a loopback address past the
 * destination rules?
 */
const APP_ENV = process.env.APP_ENV;

beforeEach(() => {
  delete process.env.APP_ENV;
});

afterEach(() => {
  if (APP_ENV === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = APP_ENV;
});

describe('isLoopbackHostname', () => {
  it('recognises localhost and everything under it', () => {
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('app.localhost')).toBe(true);
    expect(isLoopbackHostname('api.staging.localhost')).toBe(true);
  });

  /**
   * The suffix trap, one level down from the one `domains.test.ts` guards.
   * `notlocalhost` ends with the string but is a registrable public name, and
   * `localhost.evil.com` is somebody else's domain entirely.
   */
  it('is not fooled by a name that merely ends in the word', () => {
    expect(isLoopbackHostname('notlocalhost')).toBe(false);
    expect(isLoopbackHostname('localhost.evil.com')).toBe(false);
    expect(isLoopbackHostname('questioncall.com')).toBe(false);
  });
});

describe('the deployment gate', () => {
  /**
   * The important one. `apps/web/lib/env.ts` *defaults* `APP_ENV` to `local`,
   * so if this read went through the parsed env a deployment that never set
   * the variable would have the hatch open. Reading `process.env` directly
   * means unset is `undefined`, which is not `'local'`.
   */
  it('is shut when APP_ENV is not set at all', () => {
    expect(isLoopbackAllowed('test')).toBe(false);
    expect(normalizeHostname('http://app.localhost:3000/paid')).toBeNull();
  });

  it('is shut on preview and production', () => {
    for (const value of ['preview', 'production']) {
      process.env.APP_ENV = value;
      expect(isLoopbackAllowed('test')).toBe(false);
      expect(normalizeHostname('http://app.localhost:3000/paid')).toBeNull();
    }
  });

  it('opens for a Sandbox credential on a local deployment', () => {
    process.env.APP_ENV = 'local';
    expect(isLoopbackAllowed('test')).toBe(true);
  });

  /**
   * A Production credential has no business pointing at a loopback address
   * even on a laptop — `webhook_url` is fetched by our own server.
   */
  it('stays shut for a Production credential even locally', () => {
    process.env.APP_ENV = 'local';
    expect(isLoopbackAllowed('live')).toBe(false);
    expect(() =>
      assertLoopbackAllowed('app.localhost', 'live', 'webhookUrl'),
    ).toThrow(/Production/);
  });
});

describe('http, on a local deployment', () => {
  beforeEach(() => {
    process.env.APP_ENV = 'local';
  });

  it('accepts the address a SaaS under construction actually runs on', () => {
    expect(normalizeHostname('http://app.localhost:3000/paid')).toBe(
      'app.localhost',
    );
  });

  /**
   * The port is not part of a hostname, which is what makes one registered
   * row cover every port the dev server happens to land on.
   */
  it('drops the port, so one row covers 3000 and 3001 alike', () => {
    expect(normalizeHostname('http://app.localhost:3001/x')).toBe(
      'app.localhost',
    );
    expect(normalizeHostname('https://app.localhost/x')).toBe('app.localhost');
  });

  /**
   * The hatch is for loopback names only. `http://` anywhere else is still
   * refused, locally included — otherwise a dev deployment would happily
   * deliver webhooks in the clear to a real host.
   */
  it('does not widen http for any other host', () => {
    expect(normalizeHostname('http://questioncall.com/pay')).toBeNull();
    expect(normalizeHostname('http://169.254.169.254/latest/')).toBeNull();
    expect(normalizeHostname('http://192.168.1.1/admin')).toBeNull();
  });

  /**
   * Bare `localhost` is a single label, and `application_domains.hostname`
   * requires at least two — so it could never be stored, and accepting it
   * here would only produce a URL that matches no row. Devs use
   * `app.localhost`, which is what this project already does for its own four
   * surfaces (docs/ENVIRONMENT.md §1).
   */
  it('still refuses bare localhost, which the database cannot store', () => {
    expect(normalizeHostname('http://localhost:3000')).toBeNull();
    expect(normalizeHostname('https://localhost:3000')).toBeNull();
  });

  it('still refuses every scheme that is not http or https', () => {
    expect(normalizeHostname('javascript:alert(1)')).toBeNull();
    expect(normalizeHostname('data:text/html,<script>')).toBeNull();
    expect(normalizeHostname('file:///etc/passwd')).toBeNull();
    expect(normalizeHostname('ftp://app.localhost/x')).toBeNull();
  });
});
