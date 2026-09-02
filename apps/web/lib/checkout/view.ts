/**
 * What the checkout page is allowed to know, and which of five pages it is.
 *
 * The page this replaces took its content from hardcoded props — an invoice
 * number, a customer called "Himalayan Tech Pvt Ltd", and `2500000n`, all
 * written into the component. It never read the session. Anyone opening any
 * checkout URL saw the same invented invoice, and the pay button posted to a
 * webhook route claiming success.
 *
 * The shape returned here is a discriminated union rather than a session plus
 * some booleans, because the states are genuinely different pages and the
 * failure worth engineering out is rendering a payable one for a session that
 * is expired, paid or cancelled. A caller cannot read `amountMinor` without
 * first narrowing to `payable`.
 */
import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import {
  customers,
  db,
  invoices,
  paymentProviders,
  paymentSessions,
  products,
  type PaymentSession,
} from '@softmato/db';
import {
  expireIfDue,
  isPaymentError,
  loadSession,
  type ProviderId,
} from '@softmato/payment-core';

import {
  readPresentation,
  type Presentation,
} from '@/lib/documents/presentation';
import { availableProviders } from '@/lib/payments/providers';

export interface CheckoutProvider {
  id: ProviderId;
  displayName: string;
}

interface Summary {
  sessionId: string;
  invoiceNo: string;
  productName: string;
  customerName: string;
  customerEmail: string | null;
  amountMinor: bigint;
  currency: string;
  /**
   * What the SaaS is selling, in its own words — plan name, bullets,
   * highlights. `null` when the integrator sent none, and the page then shows
   * the product name alone rather than an invented plan.
   */
  presentation: Presentation | null;
}

export type CheckoutView =
  | ({ state: 'payable'; providers: CheckoutProvider[]; expiresAt: Date } & Summary)
  | ({ state: 'paid' } & Summary)
  | ({ state: 'expired' } & Summary)
  | ({ state: 'closed'; status: string } & Summary)
  /** No such session, or an id that is not even the right shape. */
  | { state: 'unknown' };

export async function checkoutView(sessionId: string): Promise<CheckoutView> {
  let session: PaymentSession;

  try {
    // Settles expiry before anything reads the status. `expires_at` passing
    // does not change a row on its own, and a page that compared the two
    // itself is a page that eventually forgets to.
    session = await expireIfDue(db, await loadSession(db, sessionId));
  } catch (error) {
    if (isPaymentError(error) && error.code === 'RESOURCE_NOT_FOUND') {
      return { state: 'unknown' };
    }

    throw error;
  }

  const summary = await summarise(session);

  if (!summary) return { state: 'unknown' };

  if (session.status === 'succeeded') return { state: 'paid', ...summary };
  if (session.status === 'expired') return { state: 'expired', ...summary };

  if (session.status === 'cancelled' || session.status === 'failed') {
    return { state: 'closed', status: session.status, ...summary };
  }

  return {
    state: 'payable',
    providers: await offerable(session),
    expiresAt: session.expiresAt,
    ...summary,
  };
}

/**
 * Everything the page displays, read once.
 *
 * Inner joins throughout: a session whose invoice, customer or product is
 * missing is not a page to render with blanks in it. It returns `unknown`,
 * which is a 404 — the same answer a stranger guessing session ids gets, and
 * therefore one that tells them nothing.
 */
async function summarise(session: PaymentSession): Promise<Summary | null> {
  const [row] = await db
    .select({
      invoiceNo: invoices.invoiceNo,
      productName: products.name,
      customerName: customers.name,
      customerEmail: customers.email,
      invoiceMetadata: invoices.metadata,
    })
    .from(paymentSessions)
    .innerJoin(invoices, eq(invoices.id, paymentSessions.invoiceId))
    .innerJoin(products, eq(products.id, paymentSessions.productId))
    .innerJoin(customers, eq(customers.id, paymentSessions.customerId))
    .where(eq(paymentSessions.id, session.id))
    .limit(1);

  if (!row) return null;

  const { invoiceMetadata, ...rest } = row;

  return {
    sessionId: session.id,
    // The amount comes from the session, which computed it from the invoice
    // when it was created. Never from a query parameter, and never recomputed
    // here — the customer pays what they were quoted.
    amountMinor: session.amountMinor,
    currency: session.currency,
    /*
     * Re-validated on read rather than trusted from the column — it is
     * integrator-supplied text about to be rendered to a paying customer.
     * Anything that fails becomes `null`, which renders as nothing.
     */
    presentation: readPresentation(invoiceMetadata),
    ...rest,
  };
}

/**
 * The providers this customer may actually use: three lists intersected.
 *
 *   1. `session.allowed_providers`, computed from the amount when the session
 *      was created. The list the customer was shown is the list they are held
 *      to, so a provider deactivated mid-session does not change the page in
 *      front of a human.
 *   2. `payment_providers.is_active`, for the display name and the order.
 *   3. What the composition root actually registered — because a provider with
 *      no credentials has no adapter, and drawing its button would render a
 *      control whose only behaviour is to throw.
 *
 * The third is the one that is easy to forget and the only one that fails at
 * the moment of payment rather than before it.
 */
async function offerable(session: PaymentSession): Promise<CheckoutProvider[]> {
  const allowed = session.allowedProviders;

  if (allowed.length === 0) return [];

  const registered = new Set<string>(availableProviders());

  const rows = await db
    .select({ id: paymentProviders.id, displayName: paymentProviders.displayName })
    .from(paymentProviders)
    .where(
      and(
        inArray(paymentProviders.id, allowed),
        eq(paymentProviders.isActive, true),
      ),
    )
    .orderBy(asc(paymentProviders.sortOrder));

  return rows
    .filter((row) => registered.has(row.id))
    .map((row) => ({ id: row.id as ProviderId, displayName: row.displayName }));
}
