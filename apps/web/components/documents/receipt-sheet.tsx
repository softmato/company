/**
 * The receipt, set to the billing spec §6.
 *
 * **Narrower than the invoice on purpose** (A5 against A4). The two documents
 * are told apart across a desk before either is read, which is the point of
 * the size difference — an invoice is a demand and a receipt is a confirmation,
 * and confusing them is a phone call.
 *
 * **It never restates the line items.** The invoice is the record of what was
 * sold; this is the record that money arrived. Repeating the table would
 * create a second place the description could differ from the first.
 */
import { amountInWords } from '@/lib/documents/amount-in-words';
import type { ReceiptDocument } from '@/lib/documents/types';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';

import { DocumentDate, PartyBlock, vatNote } from './parts';

export function ReceiptSheet({ document }: { document: ReceiptDocument }) {
  const settled = document.balanceDueMinor <= 0n;

  return (
    <article className="sheet sheet--receipt">
      <header className="sheet-head">
        <div>
          <p className="seller-name">{document.seller.name}</p>
          <p className="seller-lines">
            <span className={document.seller.pan ? 'num' : 'absent'}>
              {document.seller.pan
                ? `PAN: ${document.seller.pan}`
                : 'PAN not set'}
            </span>
            {document.seller.email ? <span>{document.seller.email}</span> : null}
          </p>
        </div>
      </header>

      <h1 className="doc-title" style={{ margin: '6mm 0 5mm' }}>
        Payment receipt
      </h1>

      <table className="meta" style={{ marginLeft: 0 }}>
        <tbody>
          <tr>
            <th>Receipt No.</th>
            <td className="num">{document.receiptNo}</td>
          </tr>
          <tr>
            <th>Receipt Date</th>
            <td>
              <DocumentDate value={document.paidAt} />
            </td>
          </tr>
          <tr>
            <th>Against Invoice</th>
            <td className="num">
              {document.invoiceNo} (FY {document.fiscalYear})
            </td>
          </tr>
        </tbody>
      </table>

      <section className="parties" style={{ borderTop: '1px solid var(--doc-rule)', marginTop: '5mm' }}>
        <PartyBlock label="Received from" party={document.customer} />
      </section>

      <section className="received">
        <p className="label">Amount received</p>
        <p className="received-amount">
          {document.currency} {formatPaisa(document.amountMinor)}
        </p>
        <p className="received-words">{amountInWords(document.amountMinor)}</p>
      </section>

      <table className="detail">
        <tbody>
          <tr>
            <th>Payment method</th>
            <td>{document.providerName}</td>
          </tr>
          <tr>
            <th>Transaction ID</th>
            <td className="num">
              {document.providerRef ?? <span className="absent">—</span>}
            </td>
          </tr>
          <tr>
            <th>Paid at</th>
            <td className="num">{formatAdDateTime(document.paidAt)} NPT</td>
          </tr>
          {document.forDescription ? (
            <tr>
              <th>For</th>
              <td>{document.forDescription}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="settlement">
        <table className="detail" style={{ width: 'auto' }}>
          <tbody>
            <tr>
              <th>Invoice total</th>
              <td className="num">{formatPaisa(document.invoiceTotalMinor)}</td>
            </tr>
            <tr>
              <th>Total received</th>
              <td className="num">
                {formatPaisa(document.totalReceivedMinor)}
              </td>
            </tr>
            <tr>
              <th>Balance due</th>
              <td className="num">
                {formatPaisa(
                  document.balanceDueMinor > 0n ? document.balanceDueMinor : 0n,
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/*
          Spec §6: "PAID IN FULL", or "PART PAYMENT" with the remainder shown.
          The badge reads the balance rather than the invoice's stored status,
          because this document is about what is true now that this payment has
          landed.
        */}
        <span className={`badge badge--${settled ? 'paid' : 'partially_paid'}`}>
          {settled ? 'Paid in full' : 'Part payment'}
        </span>
      </div>

      <div className="notes">
        <p>{vatNote(document.seller.name)}</p>
      </div>

      <footer className="sheet-foot">
        <span>Computer-generated receipt. No signature required.</span>
        {/* Our own trail. Small, because it means nothing to the customer —
            but it is what an accountant traces the payment through. */}
        {document.journalNo ? (
          <span className="num">{document.journalNo}</span>
        ) : null}
      </footer>
    </article>
  );
}
