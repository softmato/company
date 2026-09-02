import 'server-only';

import { readPresentation } from './presentation';
import { findInvoice, invoiceLinesFor, type InvoiceRecord } from './queries';
import { sellerParty } from './seller-query';
import { resolveParties } from './snapshot';
import type { DocumentStatus, InvoiceDocument, Party } from './types';

/**
 * An `invoices` row → the document the spec §5 describes.
 *
 * All the derivation lives here so the renderer has nothing to decide. A
 * template that computed `amount_due` would be a second place the arithmetic
 * could be wrong, and it would be the place nobody tests.
 */
export async function buildInvoiceDocument(
  invoiceNo: string,
  /**
   * When given, the invoice must belong to this application or nothing is
   * returned. The `/v1` API passes the authenticated caller; the admin panel
   * passes nothing. See `queries.ts`.
   */
  ownerApplicationId?: number,
): Promise<InvoiceDocument | null> {
  const record = await findInvoice(invoiceNo, ownerApplicationId);

  if (!record) return null;

  const [lines, liveSeller] = await Promise.all([
    invoiceLinesFor(record.id),
    sellerParty(),
  ]);

  const parties = resolveParties(
    record.metadata,
    liveSeller,
    customerParty(record),
  );

  return {
    kind: 'invoice',
    invoiceNo: record.invoiceNo,
    fiscalYear: record.fiscalYear,
    seller: parties.seller,
    customer: parties.customer,
    issuedAt: record.issuedAt,
    dueAt: record.dueAt,
    lines: lines.map((line) => ({
      lineNo: line.lineNo,
      description: line.description,
      /*
       * The service window is on the invoice, not the line — the schema has
       * one period per invoice (`service_starts_at` / `service_ends_at`). It
       * is repeated onto every line because that is where §5 prints it, and
       * because a line is the thing a reader asks "for what period?" about.
       */
      periodStart: record.serviceStartsAt,
      periodEnd: record.serviceEndsAt,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      amountMinor: line.amountMinor,
    })),
    subtotalMinor: record.subtotalMinor,
    discountMinor: record.discountMinor,
    taxMinor: record.taxMinor,
    totalMinor: record.totalMinor,
    paidMinor: record.paidMinor,
    dueMinor: record.totalMinor - record.paidMinor,
    currency: record.currency,
    status: documentStatus(record),
    presentation: readPresentation(record.metadata),
    renderedFromLiveParties: parties.fromLive,
  };
}

function customerParty(record: InvoiceRecord): Party {
  return {
    name: record.customerName,
    address: record.customerAddress,
    pan: record.customerPan,
    email: record.customerEmail,
    phone: record.customerPhone,
  };
}

/**
 * The badge, which is not the stored status.
 *
 * `past_due` is the clock's opinion of an `issued` invoice and is computed at
 * render for the reason given in `lib/admin/invoices-queries.ts`: storing it
 * would need a job to keep it true. `void` and `written_off` win over the
 * clock — an invoice that was cancelled is not "overdue", it is cancelled, and
 * chasing it would be the mistake.
 */
function documentStatus(
  record: InvoiceRecord,
  now = new Date(),
): DocumentStatus {
  if (record.status === 'void') return 'void';
  if (record.status === 'written_off') return 'written_off';
  if (record.status === 'paid') return 'paid';

  const overdue = record.dueAt !== null && record.dueAt < now;

  if (record.status === 'partially_paid') {
    return overdue ? 'past_due' : 'partially_paid';
  }

  // draft and issued both read as unpaid; a draft has no number to print
  // beside the badge anyway.
  return overdue ? 'past_due' : 'unpaid';
}
