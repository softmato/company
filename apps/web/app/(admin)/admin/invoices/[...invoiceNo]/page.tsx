/**
 * `/admin/invoices/INV-2083/84-000010` — one invoice, as the document plus its
 * payment history (billing spec §7.2).
 *
 * **A catch-all segment, because an invoice number contains a slash.**
 * `INV-2083/84-000010` is one identifier and two path segments; joining them
 * back together here is cheaper and far less fragile than percent-encoding a
 * `/` and hoping every layer between the browser and the router agrees not to
 * decode it. The same applies to `TXN-…` on the receipt route.
 *
 * The document itself is the same component the PDF is rendered from, so what
 * an admin reads on this screen is what the customer received — not a
 * lookalike built from the same data.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InvoiceSheet } from '@/components/documents/invoice-sheet';
import { SheetWarning } from '@/components/documents/parts';
import { SHEET_STYLES } from '@/components/documents/sheet-styles';
import { StatusBadge } from '@/components/admin/status-badge';
import { buildInvoiceDocument } from '@/lib/documents/invoice-document';
import { documentIssues } from '@/lib/documents/issues';
import { paymentsFor, findInvoice } from '@/lib/documents/queries';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Invoice' };

export default async function AdminInvoiceDetailPage({
  params,
}: PageProps<'/admin/invoices/[...invoiceNo]'>) {
  const { invoiceNo: segments } = await params;
  const invoiceNo = segments.map(decodeURIComponent).join('/');

  const document = await buildInvoiceDocument(invoiceNo);

  if (!document) notFound();

  const record = await findInvoice(invoiceNo);
  const payments = record ? await paymentsFor(record.id) : [];
  const issues = documentIssues(document);

  const base = `/api/internal/documents/invoice/${segments.join('/')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/invoices"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Invoices
          </Link>
          <h1 className="headline mt-1 text-[30px] leading-tight">
            <span className="numeric">{document.invoiceNo}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {document.customer.name} · fiscal year{' '}
            <span className="numeric">{document.fiscalYear}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`${base}?format=html&print=1`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Print
          </a>
          <a
            href={`${base}?format=pdf`}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
          >
            Download PDF
          </a>
        </div>
      </div>

      <SheetWarning issues={issues} />

      {/*
        Injected here rather than imported into globals.css: these rules belong
        to the document, not to the app, and the document carries them wherever
        it is rendered. Every custom property in it is `--doc-*`, so nothing
        collides with the app's tokens.
      */}
      <style dangerouslySetInnerHTML={{ __html: SHEET_STYLES }} />

      <div className="sheet-root overflow-x-auto rounded-xl border border-border shadow-xs">
        <InvoiceSheet document={document} />
      </div>

      <section>
        <h2 className="text-sm font-semibold">Payment history</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every attempt, not only the successful ones — a customer who tried
          three times is the answer to most questions that reach this page.
        </p>

        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.txnNo} className="hover:bg-muted/30">
                    <td className="numeric px-4 py-3 font-semibold">
                      {payment.txnNo}
                    </td>
                    <td className="px-4 py-3">{payment.providerName}</td>
                    <td className="numeric px-4 py-3 text-muted-foreground">
                      {payment.providerTxnId ?? payment.providerRef ?? '—'}
                    </td>
                    <td className="numeric px-4 py-3 text-right font-semibold">
                      {formatPaisa(payment.grossAmountMinor)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="numeric px-4 py-3 text-muted-foreground">
                      {formatAdDateTime(
                        payment.succeededAt ?? payment.createdAt,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* Only a payment that actually landed has a receipt. */}
                      {RECEIPTED.includes(payment.status) ? (
                        <Link
                          href={`/admin/receipts/${payment.txnNo}`}
                          className="text-primary hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No payment has been attempted against this invoice.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Statuses for which a receipt exists. Mirrors `receipt-document.ts`. */
const RECEIPTED = ['succeeded', 'refunded', 'partially_refunded'];
