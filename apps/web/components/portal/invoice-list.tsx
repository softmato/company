import { Download, Receipt, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { BsDate } from '@/components/ui/bs-date';
import { buttonClasses } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import type { ClientInvoice } from '@/lib/portal/invoices';

const STATUS_LABEL: Record<string, string> = {
  issued: 'Due',
  partially_paid: 'Part paid',
  paid: 'Paid',
  void: 'Void',
  written_off: 'Written off',
};

/** Links go through the portal's own route, which checks ownership first. */
function documentHref(kind: 'invoice' | 'receipt', ref: string, pdf = true) {
  return `/api/portal/documents/${kind}/${ref.split('/').map(encodeURIComponent).join('/')}${pdf ? '?format=pdf' : ''}`;
}

function isOverdue(invoice: ClientInvoice): boolean {
  return (
    invoice.dueAt !== null &&
    invoice.dueAt < new Date() &&
    (invoice.status === 'issued' || invoice.status === 'partially_paid')
  );
}

/**
 * Cards, not a table: a client reads four or five invoices a year, often on a
 * phone, and each one wants its own actions next to it.
 */
export function InvoiceList({ invoices }: { invoices: ClientInvoice[] }) {
  return (
    <ul className="space-y-3">
      {invoices.map((invoice) => {
        const balance = invoice.totalMinor - invoice.paidMinor;
        const overdue = isOverdue(invoice);
        const open =
          invoice.status === 'issued' || invoice.status === 'partially_paid';

        return (
          <li
            key={invoice.id}
            className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-4 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-1 data-[tone=due]:before:bg-amber-400 data-[tone=late]:before:bg-rose-500 data-[tone=paid]:before:bg-emerald-500"
            data-tone={
              overdue
                ? 'late'
                : open
                  ? 'due'
                  : invoice.status === 'paid'
                    ? 'paid'
                    : 'none'
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={
                    overdue
                      ? 'grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/12 text-rose-600'
                      : open
                        ? 'grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/14 text-amber-600'
                        : 'grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600'
                  }
                >
                  <Receipt className="size-5" />
                </span>
                <div>
                  <p className="numeric text-sm font-medium">
                    {invoice.invoiceNo}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {invoice.issuedAt ? (
                      <>
                        Issued <BsDate date={invoice.issuedAt} />
                      </>
                    ) : null}
                    {invoice.dueAt ? (
                      <>
                        {' · '}
                        <span className={overdue ? 'text-flag' : undefined}>
                          {overdue ? 'Was due' : 'Due'}{' '}
                          <BsDate date={invoice.dueAt} />
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Money
                  minor={invoice.totalMinor}
                  unit
                  className="text-[17px]"
                />
                <div className="mt-1">
                  <Badge status={overdue ? 'overdue' : invoice.status}>
                    {overdue
                      ? 'Overdue'
                      : (STATUS_LABEL[invoice.status] ?? invoice.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {open && invoice.paidMinor > 0n ? (
              <p className="mt-2 text-xs text-muted-foreground">
                <Money minor={invoice.paidMinor} unit /> paid ·{' '}
                <Money minor={balance} unit tone={overdue ? 'flag' : 'plain'} />{' '}
                left to pay
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {invoice.payUrl ? (
                <a
                  href={invoice.payUrl}
                  className={buttonClasses('primary', 'sm')}
                >
                  <Wallet className="size-4" aria-hidden="true" />
                  Pay <Money minor={balance} unit />
                </a>
              ) : null}
              <a
                href={documentHref('invoice', invoice.invoiceNo)}
                className={buttonClasses('secondary', 'sm')}
              >
                <Download className="size-4" aria-hidden="true" /> Invoice PDF
              </a>
              {invoice.receipts.map((r) => (
                <a
                  key={r.txnNo}
                  href={documentHref('receipt', r.txnNo)}
                  className={buttonClasses('ghost', 'sm')}
                  title={`${r.providerName}${r.paidAt ? `, paid ${r.paidAt.toDateString()}` : ''}`}
                >
                  <Receipt className="size-4" aria-hidden="true" /> Receipt{' '}
                  <span className="numeric text-xs text-muted-foreground">
                    {r.txnNo}
                  </span>
                </a>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
