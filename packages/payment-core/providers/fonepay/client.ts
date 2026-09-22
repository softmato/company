/**
 * Fonepay's third-party merchant API: every body signed, every call but the
 * login behind a token.
 *
 * Checked against the dev gateway on 2026-09-21 with the bank's sample
 * merchant, not only read from the PDF (docs/fonepay/):
 *
 *   * `signature` is base64 RSA-SHA256 (PKCS#1 v1.5) over the **exact body
 *     bytes**. The body is serialised once and that one string is both signed
 *     and sent — re-serialising after signing is how a signature stops
 *     verifying. A bad one answers 401 `{"error":"Invalid signature"}`.
 *   * `accessToken` arrives already prefixed `Bearer ` and is sent as-is.
 *   * The bank list ignores the signature entirely (a garbage one still
 *     answers 200), so a request without a body carries none.
 */
import { createPrivateKey, sign, type KeyObject } from 'node:crypto';

import { PaymentError } from '../../errors';

export interface FonepayCredentials {
  baseUrl: string;
  username: string;
  password: string;
  /** Base64 PKCS#8 DER, the shape Fonepay's own collection uses. PEM works too. */
  privateKey: string;
}

interface Reply {
  status: number;
  text: string;
}

/** Log in again this long before Fonepay says the token expires. */
const TOKEN_MARGIN_MS = 60_000;

export class FonepayClient {
  private readonly key: KeyObject;
  private token: { value: string; expiresAt: number } | undefined;

  constructor(private readonly credentials: FonepayCredentials) {
    this.key = parsePrivateKey(credentials.privateKey);
  }

  /**
   * An authorised call. A 401 is retried once after a fresh login: a token can
   * die before its `expiresIn` (another instance logging in, a gateway
   * restart), and a payment should not fail because ours did.
   */
  async call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    let reply = await this.send(method, path, body, {
      ...headers,
      Authorization: await this.accessToken(),
    });

    if (reply.status === 401) {
      this.token = undefined;
      reply = await this.send(method, path, body, {
        ...headers,
        Authorization: await this.accessToken(),
      });
    }

    return parse<T>(path, reply);
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt)
      return this.token.value;

    const { username, password } = this.credentials;
    const basic = Buffer.from(`${username}:${password}`).toString('base64');
    const data = parse<{ accessToken?: string; expiresIn?: number }>(
      '/login',
      await this.send(
        'POST',
        '/login',
        { username, password },
        { Authorization: `Basic ${basic}` },
      ),
    );

    if (!data.accessToken) {
      throw new PaymentError(
        'PROVIDER_UNAVAILABLE',
        'Fonepay login returned no accessToken',
        {},
      );
    }

    this.token = {
      value: data.accessToken,
      // No `expiresIn` means no caching: the next call logs in again.
      expiresAt:
        Date.now() + Number(data.expiresIn ?? 0) * 1000 - TOKEN_MARGIN_MS,
    };

    return this.token.value;
  }

  private async send(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<Reply> {
    const payload = body === undefined ? undefined : JSON.stringify(body);

    try {
      const response = await fetch(`${this.credentials.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(payload === undefined
            ? {}
            : {
                'Content-Type': 'application/json',
                signature: sign(
                  'sha256',
                  Buffer.from(payload),
                  this.key,
                ).toString('base64'),
              }),
          ...headers,
        },
        ...(payload === undefined ? {} : { body: payload }),
        // A hung gateway must not hang the checkout with it.
        signal: AbortSignal.timeout(15_000),
      });

      return { status: response.status, text: await response.text() };
    } catch (error) {
      throw new PaymentError(
        'PROVIDER_UNAVAILABLE',
        'Could not reach Fonepay',
        {
          path,
          error: String(error),
        },
      );
    }
  }
}

/** Any 2xx with a JSON body — the QR endpoint answers 202, not 200. */
function parse<T>(path: string, reply: Reply): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(reply.text);
  } catch {
    parsed = undefined;
  }

  if (reply.status < 200 || reply.status >= 300 || !parsed) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      'Fonepay rejected the request',
      {
        path,
        status: reply.status,
        // Truncated: this reaches the log, never the client.
        body: reply.text.slice(0, 500),
      },
    );
  }

  return parsed as T;
}

/**
 * PEM armour, whitespace and literal `\n` pairs (how a multi-line value
 * survives a hosting dashboard) are stripped, leaving the base64 body — which
 * is the same bytes whether the key was pasted as PEM or as Fonepay's shape.
 */
function parsePrivateKey(raw: string): KeyObject {
  const der = Buffer.from(raw.replace(/-----[^-]+-----|\\n|\s/g, ''), 'base64');

  try {
    return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  } catch (error) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      'The Fonepay private key is not a base64 PKCS#8 RSA key',
      { error: String(error) },
    );
  }
}
