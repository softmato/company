import { describe, expect, it, vi } from 'vitest';

import { SoftmatoClient } from '../client';
import { SoftmatoApiError, SoftmatoTransportError } from '../errors';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clientWith(fetchImpl: typeof globalThis.fetch, maxAttempts = 3) {
  return new SoftmatoClient({
    secret: 'sk_test_123',
    baseUrl: 'https://api.test/v1',
    maxAttempts,
    fetch: fetchImpl,
  });
}

const INVOICE = {
  external_ref: 'HH-2026-00123',
  customer: { external_ref: 'cust_88', name: 'Ram Sharma' },
  lines: [{ description: 'Standard', quantity: 1, unit_price_minor: 1200000 }],
};

describe('construction', () => {
  it('refuses to be built without a secret', () => {
    expect(() => new SoftmatoClient({ secret: '  ' })).toThrow();
  });
});

describe('requests', () => {
  it('sends the bearer secret and a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ invoice_id: 'inv_1' }));

    await clientWith(fetchMock).createInvoice(INVOICE);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/v1/invoices');
    expect(init.headers.Authorization).toBe('Bearer sk_test_123');
    expect(JSON.parse(init.body)).toMatchObject({ external_ref: 'HH-2026-00123' });
  });

  /**
   * Forgetting an idempotency key does not produce an error — it produces a
   * second charge on a retry. So the safe behaviour is the default.
   */
  it('generates an Idempotency-Key for mutating calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));

    await clientWith(fetchMock).createCheckout({ invoice_id: 'inv_1' });

    const key = fetchMock.mock.calls[0]![1].headers['Idempotency-Key'];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('honours a caller-supplied key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));

    await clientWith(fetchMock).createCheckout(
      { invoice_id: 'inv_1' },
      { idempotencyKey: 'order-42' },
    );

    expect(fetchMock.mock.calls[0]![1].headers['Idempotency-Key']).toBe('order-42');
  });

  it('sends no key or body on a read', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));

    await clientWith(fetchMock).getTransaction('TXN-1');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers['Idempotency-Key']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('escapes an identifier into the path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));

    await clientWith(fetchMock).getTransaction('TXN-2082/83-00000001');

    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api.test/v1/transactions/TXN-2082%2F83-00000001',
    );
  });
});

describe('errors', () => {
  it('surfaces the documented code, not the HTTP status alone', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'The request body failed validation',
            request_id: 'req_01J',
          },
        },
        422,
      ),
    );

    await expect(clientWith(fetchMock).createInvoice(INVOICE)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      status: 422,
      requestId: 'req_01J',
    });
  });

  it('falls back to INTERNAL for a code it does not recognise', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'WAT' } }, 500));

    await expect(
      clientWith(fetchMock, 1).createInvoice(INVOICE),
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  /** A proxy or captive portal answering instead of the API. */
  it('reports a non-JSON body as a transport failure, not an API error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    await expect(
      clientWith(fetchMock, 1).createInvoice(INVOICE),
    ).rejects.toBeInstanceOf(SoftmatoTransportError);
  });
});

describe('retries', () => {
  it('retries a transport failure with the same idempotency key', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue(jsonResponse({ invoice_id: 'inv_1' }));

    await clientWith(fetchMock).createInvoice(INVOICE);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The whole point: a regenerated key would read as a new request and could
    // charge twice.
    const [first, second] = fetchMock.mock.calls;
    expect(first![1].headers['Idempotency-Key']).toBe(
      second![1].headers['Idempotency-Key'],
    );
  });

  it('retries a rate limit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'RATE_LIMITED' } }, 429))
      .mockResolvedValue(jsonResponse({ invoice_id: 'inv_1' }));

    await clientWith(fetchMock).createInvoice(INVOICE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries a validation failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'VALIDATION_FAILED' } }, 422));

    await expect(clientWith(fetchMock).createInvoice(INVOICE)).rejects.toBeInstanceOf(
      SoftmatoApiError,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * An idempotency conflict means the same key was used with a *different*
   * body. Retrying either repeats the mistake or invents a second meaning for
   * one key.
   */
  it('never retries an idempotency conflict', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'IDEMPOTENCY_CONFLICT' } }, 409));

    await expect(clientWith(fetchMock).createInvoice(INVOICE)).rejects.toMatchObject({
      retryable: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxAttempts', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      clientWith(fetchMock, 2).createInvoice(INVOICE),
    ).rejects.toBeInstanceOf(SoftmatoTransportError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
