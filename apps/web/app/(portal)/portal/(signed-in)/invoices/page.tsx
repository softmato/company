import type { Metadata } from 'next';
import { Receipt, Wallet } from 'lucide-react';

import { Money } from '@/components/ui/money';
import { EmptyArt } from '@/components/portal/empty-art';
import { InvoiceList } from '@/components/portal/invoice-list';
import { PageBanner } from '@/components/portal/page-banner';
import { ART } from '@/lib/portal/art';
import { clientInvoices } from '@/lib/portal/invoices';
import { requireViewer } from '@/lib/portal/session';

export const metadata: Metadata = { title: 'Invoices' };

export default async function PortalInvoicesPage() {
  const viewer = await requireViewer();
  const invoices = await clientInvoices(viewer.customerId);

  const owed = invoices
    .filter((i) => i.status === 'issued' || i.status === 'partially_paid')
    .reduce((n, i) => n + (i.totalMinor - i.paidMinor), 0n);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageBanner
        icon={Receipt}
        tone="amber"
        eyebrow={viewer.clientName}
        title="Invoices"
        description="Every invoice with its PDF, and a receipt for everything you have paid."
        art={ART.shield}
        aside={
          invoices.length > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-inset ring-amber-200">
              <Wallet className="size-4 text-amber-600" aria-hidden="true" />
              Balance due
              <Money
                minor={owed}
                unit
                className="font-semibold text-foreground"
              />
            </span>
          ) : null
        }
      />

      {invoices.length === 0 ? (
        <EmptyArt
          art={ART.handshake}
          title="No invoices yet"
          description="Invoices for your projects will appear here with a PDF copy, and receipts for everything you pay."
        />
      ) : (
        <InvoiceList invoices={invoices} />
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Amounts in Nepali rupees. A payment link appears on an invoice while one
        is open; to pay another way, or for a copy of anything older, send a
        message on the project.
      </p>
    </div>
  );
}
