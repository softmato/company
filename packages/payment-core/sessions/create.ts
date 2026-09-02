/**
 * `POST /v1/checkout` (docs/API.md §3), the part that is not HTTP.
 *
 * The order of the steps is the security property, and it is copied from the
 * doc verbatim: authenticate → check scope → validate → verify invoice
 * ownership → recompute amount → compute allowed_providers by amount → create
 * session. Authentication and scope happen at the route; everything from
 * ownership onwards happens here.
 *
 * **There is no amount field.** The server reads it from the invoice. A
 * client-supplied amount would be a vulnerability, and the way to make sure
 * nobody adds one later is that this function has nowhere to put it.
 */
import { and, eq, gte, isNull, lte, or } from 'drizzle-orm';

import {
  invoices,
  paymentProviders,
  paymentSessions,
  type DbTx,
  type PaymentSession,
} from '@softmato/db';

import type { AuditRecorder } from '../audit';
import type { AuthenticatedApplication } from '../applications/authenticate';
import { PaymentError } from '../errors';
import { SESSION_TTL_MS } from './expiry';
import { generateSessionId } from './id';

export interface CreateSessionInput {
  /** The `invoice_no` returned by `POST /v1/invoices`. */
  invoiceId: string;
  returnUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreatedSession {
  session: PaymentSession;
  checkoutUrl: string;
}

export async function createSession(
  tx: DbTx,
  application: AuthenticatedApplication,
  input: CreateSessionInput,
  checkoutBaseUrl: string,
  audit: AuditRecorder,
): Promise<CreatedSession> {
  const invoice = await ownedInvoice(tx, application, input.invoiceId);

  // Recomputed from our own record, every time. What is still owed, not what
  // the invoice was for — a partly paid invoice takes a session for the rest.
  const amountMinor = invoice.totalMinor - invoice.paidMinor;

  if (amountMinor <= 0n) {
    throw new PaymentError(
      'INVALID_STATE',
      'That invoice has nothing left to pay',
      { invoiceNo: invoice.invoiceNo, status: invoice.status },
    );
  }

  if (invoice.status === 'void' || invoice.status === 'written_off') {
    throw new PaymentError(
      'INVALID_STATE',
      `An invoice that is ${invoice.status} cannot be paid`,
      { invoiceNo: invoice.invoiceNo },
    );
  }

  const allowedProviders = await providersForAmount(tx, amountMinor);

  if (allowedProviders.length === 0) {
    // Better a clear failure now than a customer choosing a wallet that
    // rejects the amount halfway through paying (docs/API.md §8).
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      'No active provider accepts an amount of this size',
      { amountMinor: amountMinor.toString() },
    );
  }

  const now = new Date();
  const id = generateSessionId(application.isLive);

  const [session] = await tx
    .insert(paymentSessions)
    .values({
      id,
      invoiceId: invoice.id,
      applicationId: application.id,
      productId: invoice.productId,
      customerId: invoice.customerId,
      amountMinor,
      currency: invoice.currency,
      status: 'created',
      allowedProviders,
      returnUrl: input.returnUrl ?? null,
      metadata: input.metadata ?? {},
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    })
    .returning();

  if (!session) {
    throw new PaymentError('INTERNAL', 'Session insert returned no row', {
      id,
    });
  }

  await audit(
    {
      actorType: 'application',
      actorId: application.clientId,
      action: 'session.create',
      resourceType: 'payment_session',
      resourceId: session.id,
      afterState: {
        invoiceNo: invoice.invoiceNo,
        amountMinor: amountMinor.toString(),
        allowedProviders,
        expiresAt: session.expiresAt.toISOString(),
      },
    },
    tx,
  );

  return {
    session,
    checkoutUrl: `${checkoutBaseUrl.replace(/\/$/, '')}/checkout/${session.id}`,
  };
}

/**
 * Tenant isolation, enforced at the data layer and filtered by the
 * authenticated identity — never by a URL parameter (docs/RULES.md §6).
 *
 * Application B asking for application A's invoice gets the same 404 as one
 * asking for an invoice that does not exist. Distinguishing them would confirm
 * the invoice exists, which is the leak.
 */
async function ownedInvoice(
  tx: DbTx,
  application: AuthenticatedApplication,
  invoiceNo: string,
) {
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.invoiceNo, invoiceNo),
        eq(invoices.applicationId, application.id),
      ),
    )
    .limit(1);

  if (!invoice) {
    throw new PaymentError('RESOURCE_NOT_FOUND', 'No such invoice', {
      invoiceNo,
      clientId: application.clientId,
    });
  }

  return invoice;
}

/** docs/API.md §8 — computed per session, never static. */
async function providersForAmount(
  tx: DbTx,
  amountMinor: bigint,
): Promise<string[]> {
  const rows = await tx
    .select({ id: paymentProviders.id })
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.isActive, true),
        lte(paymentProviders.minAmountMinor, amountMinor),
        or(
          isNull(paymentProviders.maxAmountMinor),
          gte(paymentProviders.maxAmountMinor, amountMinor),
        ),
      ),
    )
    .orderBy(paymentProviders.sortOrder);

  return rows.map((row) => row.id);
}
