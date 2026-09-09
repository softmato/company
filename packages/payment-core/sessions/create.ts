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
import { registeredProviders } from '../providers/registry';
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
  /**
   * Which providers this deployment can actually put a customer in front of,
   * for this credential's mode.
   *
   * Defaulted from the registry, which is what the API route wants and is
   * evaluated per call rather than at import. It is a *parameter* because the
   * registry is process-global state, and a caller that lives outside the
   * app's module graph — `scripts/demo-checkout.mts` — provably resolves
   * `payment-core` to a different instance and would read an empty Map that
   * nobody wrote to. A capability this important should be passed where it can
   * be passed, not inferred from a global that may not be the same global.
   */
  serviceable: readonly string[] = registeredProviders(application.mode),
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

  const byAmount = await providersForAmount(tx, amountMinor);

  if (byAmount.length === 0) {
    // Better a clear failure now than a customer choosing a wallet that
    // rejects the amount halfway through paying (docs/API.md §8).
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      'No active provider accepts an amount of this size',
      { amountMinor: amountMinor.toString() },
    );
  }

  /*
   * And of those, the ones this deployment can actually put a customer in
   * front of.
   *
   * The amount filter asks the database a question about business rules; this
   * asks the process a question about wiring, and both have to be true before
   * a URL is worth handing out. Without it, a deployment missing a credential
   * answered `POST /v1/checkout` with `201` and a checkout link whose only
   * possible outcome was a page reading "No payment method is available" — the
   * integrator was told everything was fine, and their customer found out
   * otherwise. A 502 naming the mode reaches somebody who can fix it.
   *
   * The mode is the credential's, never the deployment's: a Sandbox key must
   * be refused when only live adapters are registered, however healthy the
   * deployment looks from the outside.
   */
  const registered = new Set<string>(serviceable);
  const allowedProviders = byAmount.filter((id) => registered.has(id));

  if (allowedProviders.length === 0) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      `No provider is available for a ${application.mode} session on this deployment`,
      {
        amountMinor: amountMinor.toString(),
        mode: application.mode,
        activeForAmount: byAmount,
        registeredForMode: [...registered],
      },
    );
  }

  const now = new Date();
  const id = generateSessionId(application.mode);

  const [session] = await tx
    .insert(paymentSessions)
    .values({
      id,
      invoiceId: invoice.id,
      applicationId: application.id,
      credentialId: application.credentialId,
      /*
       * The same value that shaped the id above, written down rather than left
       * to be read back out of the prefix. Everything downstream of this
       * insert -- the checkout page, the gateway callback, the retry job --
       * arrives without a credential and reads this column instead.
       */
      mode: application.mode,
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
