import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentError } from '../errors';
import { EsewaProviderAdapter } from '../providers/esewa';
import { baseString, sign } from '../providers/esewa/signature';

/** eSewa's real published sandbox secret — see `esewa-signature.test.ts`. */
const SECRET = '8gBm/:&EnhH.1/q';
const CODE = 'EPAYTEST';

function adapter(): EsewaProviderAdapter {
  return new EsewaProviderAdapter({
    merchantCode: CODE,
    secretKey: SECRET,
    env: 'sandbox',
  });
}

const SESSION_ID = 'cs_test_12345678901234567890123456789012';

const session = {
  id: SESSION_ID,
  invoiceId: 1001,
  customerId: 50,
  amountMinor: 250000n,
  currency: 'NPR',
  returnUrl: 'https://merchant.example/thanks',
} as never;

function callbackPayload(fields: Record<string, string>): { data: string } {
  const payload: Record<string, string> = {
    signed_field_names: 'status,total_amount,transaction_uuid,product_code',
    ...fields,
  };

  payload.signature = sign(
    SECRET,
    baseString(payload.signed_field_names!.split(','), payload),
  );

  return { data: Buffer.from(JSON.stringify(payload)).toString('base64') };
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('construction', () => {
  it('throws rather than falling back to the published sandbox key', () => {
    vi.stubEnv('ESEWA_MERCHANT_CODE', '');
    vi.stubEnv('ESEWA_SECRET_KEY', '');

    expect(() => new EsewaProviderAdapter()).toThrow(PaymentError);
  });
});

describe('initiate', () => {
  it('returns a form POST, because ePay v2 does not answer a GET', async () => {
    const result = await adapter().initiate(session);

    expect(result.formPost?.url).toBe(
      'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    );
    expect(result.redirectUrl).toBeUndefined();
  });

  /** eSewa accepts alphanumerics and hyphens; `${id}_${Date.now()}` had both faults. */
  it('mints a transaction_uuid eSewa will accept', async () => {
    const { providerRef, formPost } = await adapter().initiate(session);

    expect(providerRef).toMatch(/^[a-zA-Z0-9-]+$/);
    expect(providerRef).not.toContain('_');
    expect(formPost?.fields.transaction_uuid).toBe(providerRef);
  });

  /**
   * A second initiate must not mint a second reference: `startPayment` stores
   * exactly one, so a fresh uuid would leave eSewa holding an intent we have
   * no record of and would never poll.
   */
  it('is stable across calls for the same session', async () => {
    const first = await adapter().initiate(session);
    const second = await adapter().initiate(session);

    expect(second.providerRef).toBe(first.providerRef);
  });

  it('signs exactly the values it submits', async () => {
    const { formPost } = await adapter().initiate(session);
    const fields = formPost!.fields;

    expect(fields.signature).toBe(
      sign(SECRET, baseString(fields.signed_field_names!.split(','), fields)),
    );
  });

  it('sends the amount with full minor digits', async () => {
    const { formPost } = await adapter().initiate(session);

    expect(formPost?.fields.total_amount).toBe('2500.00');
    expect(formPost?.fields.amount).toBe('2500.00');
  });

  /** The customer must return to us for settlement, not to the merchant's page. */
  it('returns the customer to our own callback, not session.returnUrl', async () => {
    const { formPost } = await adapter().initiate(session);

    expect(formPost?.fields.success_url).toContain(`/checkout/${SESSION_ID}/callback`);
    expect(formPost?.fields.success_url).not.toContain('merchant.example');
  });
});

describe('handleCallback', () => {
  it('accepts a genuine payload', async () => {
    const result = await adapter().handleCallback(
      callbackPayload({
        status: 'COMPLETE',
        total_amount: '2500.00',
        transaction_uuid: 'cs-test-0001',
        product_code: CODE,
      }),
    );

    expect(result.status).toBe('succeeded');
    expect(result.grossAmountMinor).toBe(250000n);
  });

  /** The end-to-end version of the forgery in esewa-signature.test.ts. */
  it('rejects a payload whose amount was edited after signing', async () => {
    const genuine = callbackPayload({
      status: 'COMPLETE',
      total_amount: '10.00',
      transaction_uuid: 'cs-test-0001',
      product_code: CODE,
    });

    const decoded = JSON.parse(
      Buffer.from(genuine.data, 'base64').toString('utf8'),
    );
    decoded.total_amount = '250000.00';

    await expect(
      adapter().handleCallback({
        data: Buffer.from(JSON.stringify(decoded)).toString('base64'),
      }),
    ).rejects.toThrow(PaymentError);
  });

  it('reads a signed amount carrying thousands separators at full value', async () => {
    const result = await adapter().handleCallback(
      callbackPayload({
        status: 'COMPLETE',
        total_amount: '1,000.00',
        transaction_uuid: 'cs-test-0002',
        product_code: CODE,
      }),
    );

    expect(result.grossAmountMinor).toBe(100000n);
  });

  it('rejects a payload that is not base64 JSON', async () => {
    await expect(adapter().handleCallback({ data: 'not-base64-json' })).rejects.toThrow(
      PaymentError,
    );
    await expect(adapter().handleCallback({})).rejects.toThrow(PaymentError);
  });

  it('throws on a status it does not recognise', async () => {
    await expect(
      adapter().handleCallback(
        callbackPayload({
          status: 'AMBIGUOUS',
          total_amount: '2500.00',
          transaction_uuid: 'cs-test-0003',
          product_code: CODE,
        }),
      ),
    ).rejects.toThrow(PaymentError);
  });
});

describe('poll', () => {
  const txn = {
    txnNo: 'TXN-2083/84-00000001',
    providerRef: 'cs-test-0001',
    grossAmountMinor: 250000n,
  } as never;

  it('reads the status API and never invents a fee', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'COMPLETE', ref_id: '000AE01', total_amount: '2,500.00' }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await adapter().poll(txn);

    expect(result.status).toBe('succeeded');
    expect(result.grossAmountMinor).toBe(250000n);
    expect(result.providerFeeMinor).toBe(0n);
    expect(result.providerTxnId).toBe('000AE01');
  });

  it('maps NOT_FOUND rather than silently reporting pending forever', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'NOT_FOUND' }), { status: 200 }),
      ),
    );

    await expect(adapter().poll(txn)).resolves.toMatchObject({ status: 'failed' });
  });

  it('surfaces an unreachable gateway as PROVIDER_UNAVAILABLE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(adapter().poll(txn)).rejects.toThrow(PaymentError);
  });

  it('refuses to look up a transaction with no provider reference', async () => {
    await expect(
      adapter().poll({ txnNo: 'TXN-1', providerRef: null } as never),
    ).rejects.toThrow(PaymentError);
  });
});
