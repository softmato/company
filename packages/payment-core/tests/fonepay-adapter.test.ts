import { generateKeyPairSync, verify } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaymentError } from '../errors';
import { FonepayProviderAdapter } from '../providers/fonepay';

/**
 * Fonepay against a fake gateway. The real one accepted these exact request
 * shapes on 2026-09-21 (dev host, the bank's sample merchant); what these
 * tests hold still is what that check proved — above all that the signature
 * covers the bytes actually sent, which only the far side can confirm.
 */
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

const CONFIG = {
  username: 'merchant',
  password: 'secret',
  terminalId: '4271423331147924',
  // Base64 PKCS#8 DER: the shape Fonepay's own collection stores.
  privateKey: privateKey
    .export({ format: 'der', type: 'pkcs8' })
    .toString('base64'),
};

type Route = (headers: Record<string, string>) => [number, unknown];

function gateway(routes: Record<string, Route>) {
  const calls: {
    path: string;
    headers: Record<string, string>;
    body: string | undefined;
  }[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname.split('/v2')[1]!;
      const headers = init.headers as Record<string, string>;
      calls.push({ path, headers, body: init.body as string | undefined });
      const [status, body] = routes[path]!(headers);
      return new Response(JSON.stringify(body), { status });
    }),
  );

  return calls;
}

const login: Route = () => [
  200,
  { accessToken: 'Bearer tok', expiresIn: 3600 },
];

const session = {
  id: 'cs_test_x',
  invoiceId: 42,
  amountMinor: 2_500_050n,
} as never;
const txn = { txnNo: 'TXN-1', providerRef: 'abc123' } as never;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FonepayProviderAdapter', () => {
  it('signs the exact bytes it sends, in rupees, with the token as issued', async () => {
    const calls = gateway({
      '/login': login,
      '/generate-intent-qr': () => [
        202,
        { qrMessage: 'QR 1', websocketId: 'wss://ws' },
      ],
      '/banks/list': () => [
        200,
        {
          bankDetails: [
            {
              bankName: 'Laxmi',
              bankIcon: 'rel/icon.png',
              intentScheme: 'LXBLNPKA://payment/',
            },
          ],
        },
      ],
    });

    const result = await new FonepayProviderAdapter(CONFIG).initiate(
      session,
      'INV-2083/84-000042',
    );

    const signIn = calls.find((call) => call.path === '/login')!;
    expect(signIn.headers.Authorization).toBe(
      `Basic ${Buffer.from('merchant:secret').toString('base64')}`,
    );

    const qr = calls.find((call) => call.path === '/generate-intent-qr')!;
    expect(
      verify(
        'sha256',
        Buffer.from(qr.body!),
        publicKey,
        Buffer.from(qr.headers.signature!, 'base64'),
      ),
    ).toBe(true);
    expect(qr.headers.Authorization).toBe('Bearer tok');

    const sent = JSON.parse(qr.body!);
    expect(sent).toMatchObject({
      amount: 25000.5,
      billId: 'INV-2083/84-000042',
      qrType: 'DYNAMIC_QR',
    });
    expect(sent.referenceLabel).toMatch(/^[a-z0-9]{1,30}$/);

    expect(result).toEqual({
      providerRef: sent.referenceLabel,
      qrPayload: 'QR 1',
      socketUrl: 'wss://ws',
      // Relative icon dropped; scheme's trailing slash normalised.
      bankApps: [
        { name: 'Laxmi', deeplink: 'LXBLNPKA://payment/?qrPayload=QR%201' },
      ],
    });
    expect(
      calls.find((call) => call.path === '/banks/list')!.headers.signature,
    ).toBeUndefined();
  });

  it('still hands over the QR when the bank list is down', async () => {
    gateway({
      '/login': login,
      '/generate-intent-qr': () => [202, { qrMessage: 'QR' }],
      '/banks/list': () => [500, { message: 'An unexpected error occurred' }],
    });

    const result = await new FonepayProviderAdapter(CONFIG).initiate(
      session,
      'INV-2083/84-000042',
    );

    expect(result.qrPayload).toBe('QR');
    expect(result.bankApps).toEqual([]);
  });

  it('settles on what was paid, and keeps a never-scanned QR pending', async () => {
    let reply: unknown = {
      paymentStatus: 'success',
      totalTransactionAmount: '25000.50',
      requestedAmount: '25000.50',
      fonepayTraceId: 3301232,
    };
    gateway({
      '/login': login,
      '/thirdPartyDynamicQrGetStatus': () => [200, reply],
    });
    const adapter = new FonepayProviderAdapter(CONFIG);

    await expect(adapter.poll(txn)).resolves.toMatchObject({
      status: 'succeeded',
      grossAmountMinor: 2_500_050n,
      providerFeeMinor: 0n,
      providerTxnId: '3301232',
    });

    // What the dev gateway answers for a QR generated and never scanned.
    reply = {
      paymentStatus: 'timeout',
      totalTransactionAmount: '10',
      fonepayTraceId: null,
      paymentMessage: 'Data not found.',
    };
    const pending = await adapter.poll(txn);
    expect(pending.status).toBe('pending');
    expect(pending.providerTxnId).toBeUndefined();

    reply = { paymentStatus: 'mystery', totalTransactionAmount: '10' };
    await expect(adapter.poll(txn)).rejects.toThrow(PaymentError);
  });

  it('logs in once, and again only after a 401', async () => {
    let rejectNext = false;
    const calls = gateway({
      '/login': login,
      '/thirdPartyDynamicQrGetStatus': () => {
        if (rejectNext) {
          rejectNext = false;
          return [401, { error: 'Invalid token' }];
        }
        return [
          200,
          { paymentStatus: 'pending', totalTransactionAmount: '10' },
        ];
      },
    });
    const adapter = new FonepayProviderAdapter(CONFIG);
    const logins = () => calls.filter((call) => call.path === '/login').length;

    await adapter.poll(txn);
    await adapter.poll(txn);
    expect(logins()).toBe(1);

    rejectNext = true;
    await expect(adapter.poll(txn)).resolves.toMatchObject({
      status: 'pending',
    });
    expect(logins()).toBe(2);
  });

  it('takes the key as PEM too, even with escaped newlines', () => {
    const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();

    expect(
      () =>
        new FonepayProviderAdapter({
          ...CONFIG,
          privateKey: pem.replace(/\n/g, '\\n'),
        }),
    ).not.toThrow();
    expect(
      () => new FonepayProviderAdapter({ ...CONFIG, privateKey: 'not-a-key' }),
    ).toThrow(PaymentError);
  });

  it('refuses to run without credentials', () => {
    expect(
      () => new FonepayProviderAdapter({ ...CONFIG, password: ' ' }),
    ).toThrow(/FONEPAY_PASSWORD/);
    expect(
      () =>
        new FonepayProviderAdapter({ ...CONFIG, env: 'live', terminalId: '' }),
    ).toThrow(/FONEPAY_LIVE_TERMINAL_ID/);
  });
});
