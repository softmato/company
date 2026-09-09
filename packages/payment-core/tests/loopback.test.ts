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

describe('the deployment gate, which is only half the rule', () => {
  /**
   * The gate applies to **fetch** targets and nothing else, and these two are
   * the reason it exists at all. `webhook_url` is retrieved by our own server:
   * on a laptop a loopback address there reaches the developer's dev server,
   * and on a deployment it reaches *us*. Those are not the same act.
   */
  it('is shut for a fetch target when APP_ENV is not set at all', () => {
    /*
     * `apps/web/lib/env.ts` *defaults* `APP_ENV` to `local`, so if this read
     * went through the parsed env a deployment that never set the variable
     * would have the hatch open. Reading `process.env` directly means unset is
     * `undefined`, which is not `'local'`.
     */
    expect(isLoopbackAllowed('test')).toBe(false);
    expect(isLoopbackAllowed('test', 'fetch')).toBe(false);
  });

  it('is shut for a fetch target on preview and production', () => {
    for (const value of ['preview', 'production']) {
      process.env.APP_ENV = value;
      expect(isLoopbackAllowed('test', 'fetch')).toBe(false);
      expect(() =>
        assertLoopbackAllowed('app.localhost', 'test', 'webhook_url', 'fetch'),
      ).toThrow(/we would be fetching it/);
    }
  });

  it('opens for a fetch target on a local deployment', () => {
    process.env.APP_ENV = 'local';
    expect(isLoopbackAllowed('test', 'fetch')).toBe(true);
  });

  /**
   * The half that is *not* gated, and the reason the rule was split.
   *
   * A `return_url` is navigated by the customer's own browser — we never call
   * it — so a loopback address there resolves on their machine, which for a
   * Sandbox credential is the developer who typed it. Gating this on the
   * deployment cost an integrator a whole second deployment to test a
   * redirect, and bought nothing: there is no address for us to be tricked
   * into fetching, because we do not fetch it.
   */
  it('is open for a redirect from any deployment', () => {
    for (const value of ['preview', 'production', undefined]) {
      if (value === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = value;

      expect(isLoopbackAllowed('test', 'redirect')).toBe(true);
      expect(() =>
        assertLoopbackAllowed('app.localhost', 'test', 'return_url', 'redirect'),
      ).not.toThrow();
    }
  });

  /**
   * The default is the strict answer. A caller that has not thought about
   * which direction it is in must not be given the permissive one.
   */
  it('defaults to the fetch rule when the direction is not stated', () => {
    process.env.APP_ENV = 'production';
    expect(isLoopbackAllowed('test')).toBe(false);
  });

  /**
   * Mode is checked in both directions. A Production credential has no
   * business pointing at a loopback address anywhere, laptop included.
   */
  it('stays shut for a Production credential, in either direction', () => {
    process.env.APP_ENV = 'local';
    expect(isLoopbackAllowed('live')).toBe(false);
    expect(isLoopbackAllowed('live', 'redirect')).toBe(false);
    expect(() =>
      assertLoopbackAllowed('app.localhost', 'live', 'webhookUrl'),
    ).toThrow(/Production credential/);
    expect(() =>
      assertLoopbackAllowed('app.localhost', 'live', 'return_url', 'redirect'),
    ).toThrow(/Production credential/);
  });
});

describe('parsing a loopback address', () => {
  /**
   * `normalizeHostname` is a shape check and nothing more. It used to refuse
   * `http://app.localhost` unless the deployment was local, which meant
   * production could not so much as read the address a Sandbox integrator
   * wanted their browser sent back to. Authorisation moved to
   * `assertLoopbackAllowed`, where the mode and the direction are both known.
   */
  it('accepts the shape regardless of deployment', () => {
    for (const value of ['production', 'preview']) {
      process.env.APP_ENV = value;
      expect(normalizeHostname('http://app.localhost:3000/paid')).toBe(
        'app.localhost',
      );
    }
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
