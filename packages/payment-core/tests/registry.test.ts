import { beforeEach, describe, expect, it } from 'vitest';

import { PaymentError } from '../errors';
import {
  hasProvider,
  providerAdapter,
  registerProvider,
  registeredProviders,
  resetProviderRegistry,
} from '../providers/registry';
import type { ProviderAdapter, ProviderId } from '../providers/types';

function stub(id: ProviderId): ProviderAdapter {
  return {
    id,
    initiate: async () => ({ providerRef: `ref_${id}` }),
    poll: async () => ({
      status: 'pending',
      grossAmountMinor: 0n,
      providerFeeMinor: 0n,
      raw: {},
    }),
  };
}

describe('provider registry', () => {
  beforeEach(() => {
    resetProviderRegistry();
  });

  it('resolves a registered adapter', () => {
    const primary = stub('fonepay');
    registerProvider(primary, 'test');

    expect(providerAdapter('fonepay', 'test')).toBe(primary);
    expect(hasProvider('fonepay', 'test')).toBe(true);
  });

  /**
   * The case this exists for: a `payment_providers` row is active, so the
   * provider is offered on a checkout page, but no code is behind it. Better a
   * 502 the moment it is resolved than a customer sent into a dead flow.
   */
  it('refuses a provider that is configured but not implemented', () => {
    expect(() => providerAdapter('khalti', 'test')).toThrow(PaymentError);

    try {
      providerAdapter('khalti', 'test');
    } catch (err) {
      expect((err as PaymentError).code).toBe('PROVIDER_UNAVAILABLE');
    }
  });

  it('rejects an id that is not a provider at all', () => {
    try {
      providerAdapter('paypal', 'test');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as PaymentError).code).toBe('VALIDATION_FAILED');
    }
  });

  // Two modules each believing they own a provider is a wiring bug whose only
  // other symptom is payments going to whichever one imported last.
  it('refuses a double registration rather than overwriting', () => {
    registerProvider(stub('esewa'), 'test');

    expect(() => registerProvider(stub('esewa'), 'test')).toThrow(PaymentError);
    expect(registeredProviders('test')).toEqual(['esewa']);
  });

  it('reports nothing registered on a bare registry', () => {
    expect(registeredProviders('test')).toEqual([]);
    expect(registeredProviders('live')).toEqual([]);
    expect(hasProvider('fonepay', 'test')).toBe(false);
  });

  // ── The mode is part of the identity ──────────────────────────────────────

  /**
   * eSewa's sandbox and eSewa's production are two sets of credentials
   * pointed at two hosts. Registering both is the normal arrangement on a
   * deployment that serves Sandbox and Production integrators at once, so it
   * must not read as the double-registration wiring bug above.
   */
  it('keeps the same provider separate in each mode', () => {
    const sandbox = stub('esewa');
    const production = stub('esewa');

    registerProvider(sandbox, 'test');
    registerProvider(production, 'live');

    expect(providerAdapter('esewa', 'test')).toBe(sandbox);
    expect(providerAdapter('esewa', 'live')).toBe(production);
    expect(providerAdapter('esewa', 'test')).not.toBe(
      providerAdapter('esewa', 'live'),
    );
  });

  /**
   * **The property this whole arrangement exists for.**
   *
   * A deployment holding only sandbox credentials genuinely cannot take a
   * Production payment, and the honest answer is to refuse. Falling back to
   * the mode that happens to be configured would send a real customer's money
   * through eSewa's test gateway, or — in the other direction — sign a test
   * payment with a live key.
   */
  it('refuses the mode it has nothing for, rather than falling back', () => {
    registerProvider(stub('esewa'), 'test');

    expect(hasProvider('esewa', 'test')).toBe(true);
    expect(hasProvider('esewa', 'live')).toBe(false);

    try {
      providerAdapter('esewa', 'live');
      expect.unreachable('a sandbox-only registry must not serve live');
    } catch (err) {
      expect((err as PaymentError).code).toBe('PROVIDER_UNAVAILABLE');
      expect((err as PaymentError).message).toContain('live');
    }
  });

  it('lists each mode separately', () => {
    registerProvider(stub('esewa'), 'test');
    registerProvider(stub('khalti'), 'test');
    registerProvider(stub('esewa'), 'live');

    expect(registeredProviders('test').sort()).toEqual(['esewa', 'khalti']);
    expect(registeredProviders('live')).toEqual(['esewa']);
  });
});
