/**
 * Which providers a deployment can serve, resolved from its environment.
 *
 * This file exists because the production failure it describes was invisible
 * from every other angle. eSewa and Khalti were configured, their adapters
 * were written, their credentials were verified against the real gateways, the
 * unit tests passed, and the checkout page still told a paying customer "No
 * payment method is available for this invoice right now."
 *
 * Two independent causes, both silent:
 *
 *   1. **A variable present but blank.** The sandbox pair resolves as
 *      `ESEWA_SANDBOX_MERCHANT_CODE ?? ESEWA_MERCHANT_CODE`, and `??` falls
 *      through `undefined` but **not** through `''`. Pasting `.env.example`
 *      into a hosting dashboard produces exactly `ESEWA_SANDBOX_MERCHANT_CODE=`
 *      — a blank string that stops the fallback, on a dashboard that shows
 *      every credential present.
 *   2. **A deployment that can serve one mode and not the other.** Registering
 *      live adapters and no sandbox ones satisfies the boot check, which asks
 *      only whether *somebody* can pay, and then answers every `cs_test_`
 *      session with an empty list.
 *
 * Both are asserted on the value the checkout page actually reads, rather than
 * on the config object behind it — a test of the intermediate shape would have
 * passed throughout the incident.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { resetProviderRegistry } from '@softmato/payment-core';

import { availableFor, type ProviderEnv } from '@/lib/payments/providers.core';

/** The public sandbox pair, as `.env.example` and every deployment carry it. */
const SANDBOX: ProviderEnv = {
  PAYMENT_MODE: 'sandbox',
  ESEWA_MERCHANT_CODE: 'EPAYTEST',
  ESEWA_SECRET_KEY: '8gBm/:&EnhH.1/q',
  KHALTI_SECRET_KEY: 'live_secret_key_00000000000000000000000000000000',
};

beforeEach(() => {
  // The registry is module-global and every case here configures it
  // differently. Without this, case two would inherit case one's adapters and
  // agree with whatever ran first.
  resetProviderRegistry();
});

describe('a blank variable means unset, not empty', () => {
  it('registers the wallets from the unprefixed sandbox pair', () => {
    expect(availableFor(SANDBOX, 'test')).toEqual(['esewa', 'khalti']);
  });

  it('still registers them when the *_SANDBOX_* overrides are present but blank', () => {
    const blanked: ProviderEnv = {
      ...SANDBOX,
      ESEWA_SANDBOX_MERCHANT_CODE: '',
      ESEWA_SANDBOX_SECRET_KEY: '',
      KHALTI_SANDBOX_SECRET_KEY: '',
    };

    // The production symptom in one assertion: this returned [] while every
    // credential above was set, correct, and visible in the dashboard.
    expect(availableFor(blanked, 'test')).toEqual(['esewa', 'khalti']);
  });

  it('prefers a *_SANDBOX_* override that actually holds a value', () => {
    const overridden: ProviderEnv = {
      ...SANDBOX,
      ESEWA_SANDBOX_MERCHANT_CODE: 'OVERRIDE',
    };

    // Blank must not win, and a real value must — the fix cannot be "ignore
    // the override", which would break the deployments that use one.
    expect(availableFor(overridden, 'test')).toContain('esewa');
  });

  it('whitespace is blank too', () => {
    expect(
      availableFor({ ...SANDBOX, ESEWA_SANDBOX_SECRET_KEY: '   ' }, 'test'),
    ).toContain('esewa');
  });
});

describe('a mode this deployment cannot serve comes back empty', () => {
  it('offers nothing for live when only sandbox credentials are set', () => {
    expect(availableFor(SANDBOX, 'live')).toEqual([]);
  });

  it('offers nothing for test when only live credentials are set', () => {
    const liveOnly: ProviderEnv = {
      PAYMENT_MODE: 'live',
      ESEWA_LIVE_MERCHANT_CODE: 'REALCODE',
      ESEWA_LIVE_SECRET_KEY: 'realsecret',
    };

    // Not a throw: this deployment is correctly configured for the payments it
    // is meant to take. It simply cannot take a Sandbox one, and the caller
    // needs that as a value it can render, not as a 500.
    expect(availableFor(liveOnly, 'test')).toEqual([]);
    expect(availableFor(liveOnly, 'live')).toEqual(['esewa']);
  });

  it('never registers a live adapter from sandbox credentials', () => {
    // The fallback that exists for sandbox must not exist for live: a sandbox
    // key signing a real payment is the failure the whole mode split prevents.
    expect(availableFor(SANDBOX, 'live')).not.toContain('esewa');
  });
});

describe('a deployment nobody can pay on refuses to serve', () => {
  it('throws when neither mode has a single adapter', () => {
    expect(() => availableFor({ PAYMENT_MODE: 'sandbox' }, 'test')).toThrow(
      /No payment provider is configured/,
    );
  });

  it('throws on a PAYMENT_MODE it does not recognise', () => {
    // `sandbox` is the safe default for absent, but a typo is not absent — and
    // silently meaning sandbox is how a deployment ends up pointed at the
    // wrong host.
    expect(() =>
      availableFor({ ...SANDBOX, PAYMENT_MODE: 'sandbx' }, 'test'),
    ).toThrow(/not one of mock, sandbox or live/);
  });

  it('mock stands in for both wallets in both modes, and never for Fonepay', () => {
    const mock: ProviderEnv = { PAYMENT_MODE: 'mock' };

    expect(availableFor(mock, 'test')).toEqual(['esewa', 'khalti']);
    expect(availableFor(mock, 'live')).toEqual(['esewa', 'khalti']);
    expect(availableFor(mock, 'test')).not.toContain('fonepay');
  });
});
