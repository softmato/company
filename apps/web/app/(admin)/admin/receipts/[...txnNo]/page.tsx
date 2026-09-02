/**
 * `/admin/receipts/TXN-2083/84-00000008` — the receipt for one payment.
 *
 * Catch-all for the same reason as the invoice route: a transaction number
 * carries a slash.
 *
 * A payment that has not succeeded has no receipt, and this says so rather
 * than rendering an empty one — a document confirming money that never arrived
 * is worse than no document.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SheetWarning } from '@/components/documents/parts';
import { ReceiptSheet } from '@/components/documents/receipt-sheet';
import { SHEET_STYLES } from '@/components/documents/sheet-styles';
import { documentIssues } from '@/lib/documents/issues';
import { buildReceiptDocument } from '@/lib/documents/receipt-document';
import { findPayment } from '@/lib/documents/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Receipt' };

export default async function AdminReceiptPage({
  params,
}: PageProps<'/admin/receipts/[...txnNo]'>) {
  const { txnNo: segments } = await params;
  const txnNo = segments.map(decodeURIComponent).join('/');

  const document = await buildReceiptDocument(txnNo);

  if (!document) {
    // Distinguish "no such payment" from "that payment has no receipt": the
    // second is a normal state with a useful thing to say about it.
    const payment = await findPayment(txnNo);

    if (!payment) notFound();

    return (
      <div className="max-w-xl space-y-3">
        <Link
          href="/admin/payments"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Payments
        </Link>
        <h1 className="headline text-[30px] leading-tight">
          <span className="numeric">{payment.txnNo}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          This payment is <strong>{payment.status}</strong>, so there is no
          receipt. A receipt is proof that money was received; issuing one for a
          payment that has not succeeded would assert something that has not
          happened.
        </p>
        <Link
          href={`/admin/invoices/${payment.invoiceNo}`}
          className="inline-block text-sm text-primary hover:underline"
        >
          Open invoice {payment.invoiceNo}
        </Link>
      </div>
    );
  }

  const issues = documentIssues(document);
  const base = `/api/internal/documents/receipt/${segments.join('/')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/admin/invoices/${document.invoiceNo}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Invoice {document.invoiceNo}
          </Link>
          <h1 className="headline mt-1 text-[30px] leading-tight">
            Receipt <span className="numeric">{document.receiptNo}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {document.customer.name} · paid with {document.providerName}
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

      <style dangerouslySetInnerHTML={{ __html: SHEET_STYLES }} />

      <div className="sheet-root overflow-x-auto rounded-xl border border-border shadow-xs">
        <ReceiptSheet document={document} />
      </div>
    </div>
  );
}
