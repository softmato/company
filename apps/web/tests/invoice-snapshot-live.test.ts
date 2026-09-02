/**
 * That the snapshot actually lands, against a real invoice in a real database.
 *
 * `packages/payment-core/tests/invoice-snapshot.test.ts` pins the composition
 * — which fields, whose precedence — purely, and it would pass just as happily
 * if the result never reached the `metadata` column. What only a real row can
 * show is the round trip: `createInvoice` wrote it, `jsonb` kept it, and
 * `resolveParties` recognised it well enough to stop falling back.
 *
 * `renderedFromLiveParties === false` is the whole assertion. It is what the
 * admin banner reads, and it is false only when *both* parties came out of the
 * snapshot with no field borrowed from live data — so a half-written snapshot
 * fails this as loudly as a missing one.
 *
 * Skipped unless `SOFTMATO_LIVE_INVOICE` names an invoice, because it needs a
 * database and an invoice issued since the write path existed:
 *
 *     SOFTMATO_LIVE_INVOICE='INV-2083/84-000013' \
 *       pnpm --filter @softmato/web test invoice-snapshot-live
 *
 * `pnpm demo:checkout` issues one through the same `createInvoice` the API
 * calls, which is the intended way to get a subject for this.
 */
import { describe, expect, test } from 'vitest';

const invoiceNo = process.env['SOFTMATO_LIVE_INVOICE'];

describe.skipIf(!invoiceNo)('an invoice issued with snapshots', () => {
  test('renders from the frozen parties, not from live data', async () => {
    const { findInvoice } = await import('@/lib/documents/queries');
    const { buildInvoiceDocument } = await import(
      '@/lib/documents/invoice-document'
    );

    const record = await findInvoice(invoiceNo!);
    expect(record, `no invoice ${invoiceNo}`).not.toBeNull();

    const snapshots = record!.metadata['snapshots'] as
      | { seller?: Record<string, unknown>; customer?: Record<string, unknown> }
      | undefined;

    // Both halves, written in the same statement that allocated the number.
    expect(snapshots?.seller).toBeTruthy();
    expect(snapshots?.customer).toBeTruthy();

    // The customer's own name, from the row rather than from the request.
    expect(snapshots?.customer?.['name']).toBe(record!.customerName);

    const document = await buildInvoiceDocument(invoiceNo!);

    expect(document?.renderedFromLiveParties).toBe(false);
    expect(document?.seller.name).toBe(snapshots?.seller?.['name']);
    expect(document?.customer.name).toBe(snapshots?.customer?.['name']);
  }, 30_000);
});
