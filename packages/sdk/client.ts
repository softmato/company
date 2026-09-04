/**
 * The typed client a SaaS installs.
 *
 * Deliberately small and dependency-free: `fetch` and `node:crypto`, nothing
 * else. A payment SDK that drags a HTTP library into someone else's
 * application is a supply-chain surface on their checkout path, and there is
 * nothing here that needs one.
 *
 * Two things it does for the caller that they would otherwise get wrong:
 *
 * **It generates an `Idempotency-Key` when none is given.** Every mutating
 * endpoint requires one (docs/API.md §1), and the failure mode of forgetting
 * is not an error — it is a second charge on a retry. So the safe thing is the
 * default, and supplying your own is the opt-in.
 *
 * **It retries only what is safe to retry.** A transport failure is always
 * retried, because the idempotency key makes asking again harmless and the
 * request may or may not have landed. A `VALIDATION_FAILED` never is.
 */
import { randomUUID } from 'node:crypto';

import {
  isApiErrorCode,
  SoftmatoApiError,
  SoftmatoTransportError,
} from './errors.js';
import type {
  CheckoutSession,
  CreateCheckoutInput,
  CreateInvoiceInput,
  CreateRefundInput,
  DocumentFile,
  Invoice,
  InvoiceDetail,
  ReceiptDetail,
  RefundRequest,
  TransactionView,
} from './types.js';

export interface SoftmatoOptions {
  /** The secret issued with your `client_id`. Displayed once, never again. */
  secret: string;
  /** Override for sandbox or a self-hosted deployment. */
  baseUrl?: string;
  /** Per-request timeout. Default 15s. */
  timeoutMs?: number;
  /** Attempts for retryable failures, including the first. Default 3. */
  maxAttempts?: number;
  fetch?: typeof globalThis.fetch;
}

const DEFAULT_BASE_URL = 'https://softmato.com/api/v1';

interface RequestOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class SoftmatoClient {
  private readonly secret: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly doFetch: typeof globalThis.fetch;

  constructor(options: SoftmatoOptions) {
    if (!options.secret?.trim()) {
      throw new Error('SoftmatoClient needs a client secret');
    }

    this.secret = options.secret.trim();
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.doFetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * `external_ref` is unique per application and a repeat returns the existing
   * invoice, so this is safe to call again for the same order.
   */
  createInvoice(
    input: CreateInvoiceInput,
    options?: RequestOptions,
  ): Promise<Invoice> {
    return this.request<Invoice>('POST', '/invoices', input, options);
  }

  /**
   * **There is no amount parameter.** The server reads it from the invoice; a
   * client-supplied amount would be a vulnerability (docs/API.md §3).
   */
  createCheckout(
    input: CreateCheckoutInput,
    options?: RequestOptions,
  ): Promise<CheckoutSession> {
    return this.request<CheckoutSession>('POST', '/checkout', input, options);
  }

  /**
   * The endpoint to answer "is TXN-123 paid?".
   *
   * Ask this rather than deciding from a return URL's query parameters — those
   * are a claim by whoever's browser made the request. The webhook and this
   * call are the two authoritative answers.
   */
  getTransaction(
    transactionId: string,
    options?: RequestOptions,
  ): Promise<TransactionView> {
    return this.request<TransactionView>(
      'GET',
      `/transactions/${encodeURIComponent(transactionId)}`,
      undefined,
      options,
    );
  }

  /**
   * One invoice, in full — lines, both parties, totals, and the plan copy you
   * sent when you raised it.
   *
   * This is what a billing screen in your own settings is built from. It is
   * scoped to your application: an invoice belonging to another integrator
   * answers `RESOURCE_NOT_FOUND`, the same as one that does not exist.
   *
   * An invoice number contains a slash (`INV-2083/84-000010`). It is sent as
   * path segments rather than percent-encoded, because a `%2F` in a path is
   * decoded inconsistently by proxies and would arrive as a different
   * identifier than the one you asked for.
   */
  getInvoice(
    invoiceId: string,
    options?: RequestOptions,
  ): Promise<InvoiceDetail> {
    return this.request<InvoiceDetail>(
      'GET',
      `/invoices/${pathFor(invoiceId)}`,
      undefined,
      options,
    );
  }

  /**
   * The receipt for a settled payment.
   *
   * The natural follow-up to a `payment.success` webhook: the event tells you
   * money arrived, this is the document proving it. A payment that has not
   * succeeded has no receipt and answers `RESOURCE_NOT_FOUND` — a receipt for
   * money that has not arrived is a document asserting something untrue.
   */
  getReceipt(
    transactionId: string,
    options?: RequestOptions,
  ): Promise<ReceiptDetail> {
    return this.request<ReceiptDetail>(
      'GET',
      `/receipts/${pathFor(transactionId)}`,
      undefined,
      options,
    );
  }

  /**
   * The same document as a file, for attaching to your own email or offering
   * as a download.
   *
   * Returns the bytes and the content type rather than a `Blob`, so it works
   * unchanged in Node and in a worker runtime.
   *
   * **Check `contentType` before you name the file.** If no PDF engine is
   * available the server answers with the HTML rendering instead — a complete,
   * printable document, but not a PDF, and saving it as `invoice.pdf` would
   * hand your customer a file their reader refuses to open. The fallback is
   * announced rather than silent for exactly this reason.
   */
  async downloadDocument(
    document: { invoice: string } | { receipt: string },
    format: 'pdf' | 'html' = 'pdf',
    options?: RequestOptions,
  ): Promise<DocumentFile> {
    const path =
      'invoice' in document
        ? `/invoices/${pathFor(document.invoice)}`
        : `/receipts/${pathFor(document.receipt)}`;

    return this.requestFile(`${path}?format=${format}`, options);
  }

  /**
   * Files a refund request. **It does not refund anything.**
   *
   * A row is written at status `requested` and that is all: no provider is
   * contacted and no money moves. A Softmato admin approves it afterwards.
   *
   * So do not tell your customer their money is coming because this resolved.
   * The response carries a `note` saying the same thing, in the body you are
   * already parsing, because this is the mistake that costs somebody a
   * complaint rather than a stack trace.
   *
   * Needs the `refund:request` scope, which is **off by default** — most
   * integrations never call this. Ask an admin to tick it.
   */
  requestRefund(
    input: CreateRefundInput,
    options?: RequestOptions,
  ): Promise<RefundRequest> {
    return this.request<RefundRequest>('POST', '/refunds', input, options);
  }

  /**
   * A binary read, outside the JSON path.
   *
   * Not routed through `request()` because that parses every response as JSON,
   * and a PDF is not. It shares the authentication and the timeout; it does
   * not share the retry loop, because a half-downloaded 200 KB file is not a
   * transport failure worth silently repeating on a customer's behalf.
   */
  private async requestFile(
    path: string,
    options: RequestOptions = {},
  ): Promise<DocumentFile> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.doFetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secret}`,
          Accept: 'application/pdf, text/html',
        },
        signal: options.signal ?? controller.signal,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { code?: string; message?: string };
        } | null;
        const code = body?.error?.code;

        throw new SoftmatoApiError(
          isApiErrorCode(code) ? code : 'INTERNAL',
          body?.error?.message ??
            `Document request failed (${response.status})`,
          response.status,
          response.headers.get('x-request-id'),
        );
      }

      const contentType =
        response.headers.get('content-type')?.split(';')[0]?.trim() ??
        'application/octet-stream';

      return {
        contentType,
        /** Set when the server fell back to HTML, saying why. */
        pdfFallbackReason: response.headers.get('x-softmato-pdf-fallback'),
        bytes: new Uint8Array(await response.arrayBuffer()),
      };
    } catch (error) {
      if (error instanceof SoftmatoApiError) throw error;

      throw new SoftmatoTransportError(
        error instanceof Error ? error.message : 'Document request failed',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    /*
     * Generated once, outside the retry loop. A key regenerated per attempt
     * would defeat its entire purpose: the retry would read as a new request
     * and could charge a second time.
     */
    const idempotencyKey =
      method === 'POST' ? (options.idempotencyKey ?? randomUUID()) : undefined;

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await this.attempt<T>(
          method,
          path,
          body,
          idempotencyKey,
          options.signal,
        );
      } catch (error) {
        lastError = error;

        const retryable =
          error instanceof SoftmatoTransportError ||
          (error instanceof SoftmatoApiError && error.retryable);

        if (!retryable || attempt === this.maxAttempts) throw error;

        // 200ms, 400ms, 800ms … Enough to clear a brief rate limit without
        // making a caller's request hang noticeably.
        await sleep(200 * 2 ** (attempt - 1));
      }
    }

    throw lastError;
  }

  private async attempt<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    idempotencyKey: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secret}`,
      Accept: 'application/json',
    };

    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    let response: Response;

    try {
      response = await this.doFetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: signal ?? AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new SoftmatoTransportError(
        `Could not reach the Softmato API (${method} ${path})`,
        error,
      );
    }

    const payload = await readJson(response);

    if (!response.ok) throw toApiError(response.status, payload);

    return payload as T;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    /*
     * A non-JSON body from a JSON API means something in front of it answered
     * — a proxy, a load balancer, a captive portal. Reported as a transport
     * problem because that is what it is, and because parsing an error page as
     * an API error would produce a misleading `code`.
     */
    throw new SoftmatoTransportError(
      `Softmato API returned a non-JSON body (HTTP ${response.status})`,
    );
  }
}

function toApiError(status: number, payload: unknown): SoftmatoApiError {
  const error = (payload as { error?: Record<string, unknown> } | null)?.error;

  const code = isApiErrorCode(error?.code) ? error.code : 'INTERNAL';
  const message =
    typeof error?.message === 'string' ? error.message : 'Request failed';
  const requestId =
    typeof error?.request_id === 'string' ? error.request_id : null;

  return new SoftmatoApiError(code, message, status, requestId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `INV-2083/84-000010` → `INV-2083%2F84-000010`… no: → `INV-2083/84-000010`.
 *
 * The slash inside a document number is left as a path separator and each
 * segment either side of it is encoded on its own. The server's route is a
 * catch-all that rejoins them, so the number survives the round trip intact —
 * which a percent-encoded `%2F` does not reliably do through a proxy.
 */
function pathFor(reference: string): string {
  return reference.split('/').map(encodeURIComponent).join('/');
}
