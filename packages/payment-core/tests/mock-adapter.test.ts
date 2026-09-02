import { describe, expect, it } from 'vitest';

import { MockProviderAdapter } from '../providers/mock';
import {
  registerProvider,
  resetProviderRegistry,
  providerAdapter,
} from '../providers/registry';

const txn = {
  txnNo: 'TXN-2083/84-00000001',
  grossAmountMinor: 250000n,
} as never;

describe('identity', () => {
  /**
   * The mock's id was hardcoded to `'khalti'`, which made it useless for the
   * job it exists to do: registering it beside the real Khalti adapter threw
   * `Provider khalti is already registered`, and standing in for eSewa was
   * impossible.
   */
  it('stands in for whichever provider it is given', () => {
    expect(new MockProviderAdapter({ id: 'esewa' }).id).toBe('esewa');
    expect(new MockProviderAdapter({ id: 'khalti' }).id).toBe('khalti');
  });

  it('can fill the whole registry at once', () => {
    resetProviderRegistry();

    for (const id of ['esewa', 'khalti', 'fonepay'] as const) {
      registerProvider(new MockProviderAdapter({ id }));
    }

    expect(providerAdapter('esewa').id).toBe('esewa');
    expect(providerAdapter('khalti').id).toBe('khalti');

    resetProviderRegistry();
  });
});

describe('poll', () => {
  it('reports the transaction amount, so a forced success settles cleanly', async () => {
    const result = await new MockProviderAdapter({ id: 'esewa' }).poll(txn);

    expect(result.status).toBe('succeeded');
    expect(result.grossAmountMinor).toBe(250000n);
    expect(result.providerFeeMinor).toBe(0n);
  });

  it('walks one transaction through every outcome', async () => {
    const adapter = new MockProviderAdapter({ id: 'esewa' });

    for (const status of [
      'pending',
      'failed',
      'cancelled',
      'refunded',
    ] as const) {
      adapter.setForcedStatus(status);
      await expect(adapter.poll(txn)).resolves.toMatchObject({ status });
    }
  });

  it('marks its results as mocked, so they are obvious in provider_events', async () => {
    const result = await new MockProviderAdapter({ id: 'khalti' }).poll(txn);

    expect(result.raw).toMatchObject({ mock: true, providerId: 'khalti' });
  });
});

describe('refund', () => {
  it('refuses an amount outside the transaction', async () => {
    const adapter = new MockProviderAdapter({ id: 'esewa' });

    await expect(adapter.refund(txn, 0n)).rejects.toThrow();
    await expect(adapter.refund(txn, 250001n)).rejects.toThrow();
  });
});
