/**
 * The party details frozen onto an invoice at the moment it is issued.
 *
 * Billing spec §2.1: *"if the customer later changes their address, an
 * already-issued invoice must not change."* An invoice is an archival
 * document. Re-rendering a six-month-old one against today's `customers` row
 * produces a PDF that does not match the PDF the customer was sent — and the
 * difference is invisible, because both look entirely correct and only one of
 * them is the document of record.
 *
 * **This is the shape the reader expects**, so it lives here, where it is
 * written, rather than being described twice. `apps/web/lib/documents/
 * snapshot.ts` types its stored shape against `PartySnapshot`, which means the
 * two cannot drift without failing to compile.
 *
 * It goes into `invoices.metadata.snapshots` — an existing `jsonb` column —
 * for the same reason `presentation` does: adding two columns to the invoice
 * table is a migration on the money path, and this needed neither.
 *
 * **Every field is nullable but `name`.** Softmato's own PAN, address and
 * phone come from `platform_settings` and can be blank; a customer has no
 * address unless someone entered one, because the API takes none. A blank is
 * recorded as a blank. Inventing a PAN to fill a gap on a statutory document
 * is the one failure mode worse than the gap.
 */

export interface PartySnapshot {
  name: string;
  address: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
}

/** Both halves of the document's letterhead, as they stood at issue. */
export interface InvoiceSnapshots {
  /** Softmato. Read from settings by the caller — see `createInvoice`. */
  seller?: PartySnapshot;
  /** The `customers` row as it stood after this invoice's own upsert. */
  customer: PartySnapshot;
}

/**
 * A customer row → its snapshot.
 *
 * Taken from the **row**, not from the request that created the invoice. The
 * two differ in ways that matter: `address` cannot be sent through the API at
 * all and is only ever entered in the admin panel, and a PAN already on file
 * survives a request that omits one. Snapshotting the request would quietly
 * drop both from the document.
 */
export function partySnapshot(row: {
  name: string;
  address: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
}): PartySnapshot {
  return {
    name: row.name,
    address: row.address,
    pan: row.pan,
    email: row.email,
    phone: row.phone,
  };
}

/**
 * Both snapshots for one invoice.
 *
 * The seller is omitted when there is none rather than stored as `null`: the
 * reader treats a missing party as "fall back to live and say so", and a
 * `null` sitting in the column would be a third state nobody has a rule for.
 */
export function buildSnapshots(
  seller: PartySnapshot | null,
  customer: Parameters<typeof partySnapshot>[0],
): InvoiceSnapshots {
  return {
    ...(seller ? { seller } : {}),
    customer: partySnapshot(customer),
  };
}

/**
 * The `metadata` an invoice row is written with.
 *
 * **The snapshots are applied last, so a caller cannot supply them.**
 * `metadata` is a free-form field the API hands through — `presentation`
 * arrives that way — and the record of who an invoice was issued to is not
 * something an integrator may write. Merging in the other order would let a
 * request name a different customer on the document from the one in the
 * `customers` row it was billed to.
 */
export function invoiceMetadata(
  caller: Record<string, unknown> | null | undefined,
  snapshots: InvoiceSnapshots,
): Record<string, unknown> {
  return { ...(caller ?? {}), snapshots };
}
