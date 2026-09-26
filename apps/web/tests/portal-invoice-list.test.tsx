/**
 * What a client is shown for each invoice: the balance, whether it is late,
 * a pay link only while one is open, and document links that go through the
 * portal's ownership-checking route rather than the admin one.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InvoiceList } from '@/components/portal/invoice-list';
import type { ClientInvoice } from '@/lib/portal/invoices';

const base: ClientInvoice = {
  id: 1,
  invoiceNo: 'INV-2083/84-000010',
  status: 'issued',
  totalMinor: 5_000_000n,
  paidMinor: 0n,
  issuedAt: new Date('2026-09-01T06:00:00Z'),
  dueAt: new Date('2030-01-01T06:00:00Z'),
  payUrl: null,
  receipts: [],
};

const render = (invoices: ClientInvoice[]) =>
  renderToStaticMarkup(<InvoiceList invoices={invoices} />);

describe('InvoiceList', () => {
  it('links documents through the portal route, slash and all', () => {
    const html = render([base]);
    expect(html).toContain(
      '/api/portal/documents/invoice/INV-2083/84-000010?format=pdf',
    );
    expect(html).not.toContain('/api/internal/');
  });

  it('offers to pay the remaining balance only when a session is open', () => {
    expect(render([base])).not.toContain('Pay');

    const html = render([
      {
        ...base,
        status: 'partially_paid',
        paidMinor: 2_000_000n,
        payUrl: 'https://payment.example/checkout/abc',
      },
    ]);
    expect(html).toContain('https://payment.example/checkout/abc');
    expect(html).toContain('30,000.00'); // 50,000 − 20,000
  });

  it('calls an unpaid invoice past its due date overdue', () => {
    const html = render([{ ...base, dueAt: new Date('2020-01-01T06:00:00Z') }]);
    expect(html).toContain('Overdue');
    expect(html).toContain('Was due');
  });

  it('lists a receipt for each payment', () => {
    const html = render([
      {
        ...base,
        status: 'paid',
        paidMinor: base.totalMinor,
        receipts: [
          {
            txnNo: 'TXN-2083/84-00000007',
            amountMinor: base.totalMinor,
            providerName: 'Fonepay',
            paidAt: null,
          },
        ],
      },
    ]);
    expect(html).toContain(
      '/api/portal/documents/receipt/TXN-2083/84-00000007?format=pdf',
    );
    expect(html).not.toContain('Overdue');
  });
});
