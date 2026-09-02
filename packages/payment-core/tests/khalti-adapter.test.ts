import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentError } from '../errors';
import { KhaltiProviderAdapter } from '../providers/khalti';

function adapter(): KhaltiProviderAdapter {
  return new KhaltiProviderAdapter({
    secretKey: 'test-secret',
    env: 'sandbox',
  });
}

const txn = {
  txnNo: 'TXN-2083/84-00000001',
  providerRef: 'pidx_abc123',
  grossAmountMinor: 250000n,
} as never;

function respond(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('construction', () => {
  it('throws when KHALTI_SECRET_KEY is unset', () => {
    vi.stubEnv('KHALTI_SECRET_KEY', '');

    expect(() => new KhaltiProviderAdapter()).toThrow(PaymentError);
  });
});

/**
 * Khalti never pushes. The customer returns to a URL carrying query
 * parameters, and those are a claim by whoever's browser made the request —
 * not by Khalti. The old adapter answered that claim by fabricating a
 * transaction (`{ providerRef, grossAmountMinor: 0n } as unknown as
 * Transaction`) and polling with it. Settlement must look the real row up
 * instead, so there is nothing here to call.
 */
describe('handleCallback', () => {
  it('is not implemented, because a Khalti return URL proves nothing', () => {
    expect(
      (adapter() as { handleCallback?: unknown }).handleCallback,
    ).toBeUndefined();
  });
});

describe('poll', () => {
  it('takes the fee from Khalti verbatim, never as a percentage', async () => {
    respond({
      status: 'Completed',
      total_amount: 250000,
      transaction_id: 'txn_khalti_99',
      fee: 3250,
    });

    const result = await adapter().poll(txn);

    expect(result.status).toBe('succeeded');
    expect(result.grossAmountMinor).toBe(250000n);
    // Not 2.9% of anything — Khalti's own number (RULES.md §2.7).
    expect(result.providerFeeMinor).toBe(3250n);
    expect(result.providerTxnId).toBe('txn_khalti_99');
  });

  it('treats an absent fee as zero, not as an estimate', async () => {
    respond({ status: 'Pending', total_amount: 250000 });

    await expect(adapter().poll(txn)).resolves.toMatchObject({
      status: 'pending',
      providerFeeMinor: 0n,
    });
  });

  it('maps every documented Khalti status', async () => {
    const cases = {
      Completed: 'succeeded',
      Pending: 'pending',
      Initiated: 'pending',
      Expired: 'expired',
      'User canceled': 'cancelled',
      Failed: 'failed',
      Refunded: 'refunded',
      'Partially Refunded': 'refunded',
    } as const;

    for (const [khalti, expected] of Object.entries(cases)) {
      respond({ status: khalti, total_amount: 250000 });
      await expect(adapter().poll(txn)).resolves.toMatchObject({
        status: expected,
      });
    }
  });

  it('throws on a status it does not recognise', async () => {
    respond({ status: 'Something New', total_amount: 250000 });

    await expect(adapter().poll(txn)).rejects.toThrow(PaymentError);
  });

  /** `BigInt(data.total_amount || 0)` turned this into a confident zero. */
  it('throws when the lookup carries no amount', async () => {
    respond({ status: 'Completed' });

    await expect(adapter().poll(txn)).rejects.toThrow(PaymentError);
  });

  it('surfaces a rejected request as PROVIDER_UNAVAILABLE', async () => {
    respond({ detail: 'Invalid token' }, 401);

    await expect(adapter().poll(txn)).rejects.toThrow(PaymentError);
  });
});

describe('initiate', () => {
  it('throws when Khalti answers without a pidx', async () => {
    respond({ payment_url: 'https://test-pay.khalti.com/?pidx=x' });

    await expect(
      adapter().initiate({
        id: 'cs_test',
        invoiceId: 1,
        amountMinor: 250000n,
      } as never),
    ).rejects.toThrow(PaymentError);
  });
});

/**
 * The bug a real sandbox cancellation found.
 *
 * Khalti answers a cancelled payment with **HTTP 400** and a complete lookup
 * body. The adapter treated any non-2xx as a transport failure, so the most
 * ordinary outcome in payments — the customer pressed cancel — was thrown as
 * `PROVIDER_UNAVAILABLE` and reached the customer as "Something broke on our
 * side". The polling job hit the same throw on every subsequent run.
 *
 * The rule these pin: on a non-2xx, the body decides, not the status code —
 * but only when it carries a status we already know how to map.
 */
describe('a non-2xx that is really an answer', () => {
  it('reads a cancellation out of a 400 instead of throwing', async () => {
    respond(
      {
        pidx: 'pidx_abc123',
        total_amount: 250000,
        status: 'User canceled',
        transaction_id: null,
        fee: 0,
        refunded: false,
        error_key: 'khalti_error',
      },
      400,
    );

    const result = await adapter().poll(txn);

    expect(result.status).toBe('cancelled');
    expect(result.grossAmountMinor).toBe(250000n);
    expect(result.providerFeeMinor).toBe(0n);
  });

  it('still throws on a 401, which carries no status', async () => {
    respond({ detail: 'Invalid token.' }, 401);

    await expect(adapter().poll(txn)).rejects.toThrow(PaymentError);
  });

  it('still throws on an unknown pidx, which carries no status', async () => {
    respond({ detail: 'Not found.', error_key: 'validation_error' }, 404);

    await expect(adapter().poll(txn)).rejects.toThrow(PaymentError);
  });

  it('still throws when a 400 carries a status we have no mapping for', async () => {
    respond(
      { pidx: 'pidx_abc123', total_amount: 250000, status: 'Astonished' },
      400,
    );

    await expect(adapter().poll(txn)).rejects.toThrow(PaymentError);
  });
});
