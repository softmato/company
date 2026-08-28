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
    registerProvider(primary);

    expect(providerAdapter('fonepay')).toBe(primary);
    expect(hasProvider('fonepay')).toBe(true);
  });

  /**
   * The case this exists for: a `payment_providers` row is active, so the
   * provider is offered on a checkout page, but no code is behind it. Better a
   * 502 the moment it is resolved than a customer sent into a dead flow.
   */
  it('refuses a provider that is configured but not implemented', () => {
    expect(() => providerAdapter('khalti')).toThrow(PaymentError);

    try {
      providerAdapter('khalti');
    } catch (err) {
      expect((err as PaymentError).code).toBe('PROVIDER_UNAVAILABLE');
    }
  });

  it('rejects an id that is not a provider at all', () => {
    try {
      providerAdapter('paypal');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as PaymentError).code).toBe('VALIDATION_FAILED');
    }
  });

  // Two modules each believing they own a provider is a wiring bug whose only
  // other symptom is payments going to whichever one imported last.
  it('refuses a double registration rather than overwriting', () => {
    registerProvider(stub('esewa'));

    expect(() => registerProvider(stub('esewa'))).toThrow(PaymentError);
    expect(registeredProviders()).toEqual(['esewa']);
  });

  it('reports nothing registered on a bare registry', () => {
    expect(registeredProviders()).toEqual([]);
    expect(hasProvider('fonepay')).toBe(false);
  });
});
