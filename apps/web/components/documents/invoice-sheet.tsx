/**
 * The invoice, set to the billing spec §5.
 *
 * One component, three destinations: the admin page, the browser's print
 * dialog, and the headless render that becomes the emailed PDF. They are the
 * same markup because a customer disputing an invoice and an admin looking at
 * it must be looking at the same document.
 *
 * Two things here are compliance rather than layout, and neither may be
 * "tidied":
 *
 *   - **The title is `INVOICE`.** Never "Tax Invoice", never "VAT Invoice".
 *     Softmato is PAN-registered and not VAT-registered; the other two words
 *     are claims about a registration we do not hold.
 *   - **There is no VAT row**, not even a zero one. The footer sentence is the
 *     whole of the statement. A `VAT: 0%` line implies registration.
 */
import { amountInWords } from '@/lib/documents/amount-in-words';
import type { InvoiceDocument } from '@/lib/documents/types';
import { formatPaisa } from '@/lib/format/money';

import { DocumentDate, PartyBlock, StatusBadge, vatNote } from './parts';

export function InvoiceSheet({ document }: { document: InvoiceDocument }) {
  const voided =
    document.status === 'void' || document.status === 'written_off';

  return (
    <article className="sheet">
      {voided ? (
        <div className="watermark" aria-hidden="true">
          <span>{document.status === 'void' ? 'Void' : 'Written off'}</span>
        </div>
      ) : null}

      <header className="sheet-head">
        <div>
          <p className="seller-name">{document.seller.name}</p>
          <p className="seller-lines">
            {document.seller.address ? (
              <span>{document.seller.address}</span>
            ) : null}
            {document.seller.phone ? (
              <span className="num">{document.seller.phone}</span>
            ) : null}
            {document.seller.email ? (
              <span>{document.seller.email}</span>
            ) : null}
            {/* Mandatory on our side, and stated as absent when it is. */}
            <span className={document.seller.pan ? 'num' : 'absent'}>
              {document.seller.pan
                ? `PAN: ${document.seller.pan}`
                : 'PAN not set'}
            </span>
          </p>
        </div>

        <div>
          <h1 className="doc-title">Invoice</h1>
          <table className="meta">
            <tbody>
              <tr>
                <th>Invoice No.</th>
                <td className="num">{document.invoiceNo}</td>
              </tr>
              <tr>
                <th>Fiscal Year</th>
                <td className="num">{document.fiscalYear}</td>
              </tr>
              {document.issuedAt ? (
                <tr>
                  <th>Invoice Date</th>
                  <td>
                    <DocumentDate value={document.issuedAt} />
                  </td>
                </tr>
              ) : null}
              {document.dueAt ? (
                <tr>
                  <th>Due Date</th>
                  <td>
                    <DocumentDate value={document.dueAt} />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </header>

      <section className="parties">
        <PartyBlock label="Bill to" party={document.customer} showAbsentPan />

        <div className="party-status">
          <p className="label">Status</p>
          <StatusBadge status={document.status} />
          <p className="badge-amount">
            Amount due
            <strong>
              {document.currency} {formatPaisa(document.dueMinor)}
            </strong>
          </p>
        </div>
      </section>

      <table className="lines">
        <thead>
          <tr>
            <th className="col-no">#</th>
            <th>Description</th>
            <th className="col-period">Period</th>
            <th className="col-qty">Qty</th>
            <th className="col-rate">Rate</th>
            <th className="col-amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          {document.lines.map((line) => (
            <tr key={line.lineNo}>
              <td className="col-no num">{line.lineNo}</td>
              <td>{line.description}</td>
              <td className="col-period line-period">
                {line.periodStart && line.periodEnd ? (
                  <>
                    <span className="num">{isoDay(line.periodStart)} →</span>
                    <span className="num">{isoDay(line.periodEnd)}</span>
                  </>
                ) : (
                  <span>—</span>
                )}
              </td>
              <td className="col-qty num">{trimQuantity(line.quantity)}</td>
              <td className="col-rate num">
                {formatPaisa(line.unitPriceMinor)}
              </td>
              <td className="col-amt num">{formatPaisa(line.amountMinor)}</td>
            </tr>
          ))}
          {document.lines.length === 0 ? (
            <tr>
              <td colSpan={6} className="absent">
                This invoice has no lines recorded.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <table className="totals">
        <tbody>
          <tr>
            <th>Subtotal</th>
            <td className="num">{formatPaisa(document.subtotalMinor)}</td>
          </tr>
          {/*
            Discount is shown only when there is one. A permanent "Discount
            0.00" row is a line the reader learns to skip, and this document
            has no rows worth skipping.
          */}
          {document.discountMinor > 0n ? (
            <tr>
              <th>Discount</th>
              <td className="num">−{formatPaisa(document.discountMinor)}</td>
            </tr>
          ) : null}
          {/*
            Not a VAT row — see the note at the top of this file. It appears
            only if a non-zero tax was actually recorded, because silently
            dropping money from a total the customer pays would be worse than
            printing a row the spec did not anticipate.
          */}
          {document.taxMinor > 0n ? (
            <tr>
              <th>Tax</th>
              <td className="num">{formatPaisa(document.taxMinor)}</td>
            </tr>
          ) : null}
          <tr className="grand">
            <th>Total ({document.currency})</th>
            <td className="num">{formatPaisa(document.totalMinor)}</td>
          </tr>
          <tr>
            <th>Amount paid</th>
            <td className="num">{formatPaisa(document.paidMinor)}</td>
          </tr>
          <tr className="due">
            <th>Amount due</th>
            <td className="num">{formatPaisa(document.dueMinor)}</td>
          </tr>
        </tbody>
      </table>

      <p className="words">
        <span className="label">Amount in words</span>
        {amountInWords(document.totalMinor)}
      </p>

      {/*
        What the SaaS said it was selling, in its own words — the same block
        the customer saw on the checkout page. Printed here so the invoice and
        the payment page describe the purchase identically; a customer who
        queries a charge should find the page they paid on, not a shorter
        version of it.

        Below the totals rather than inside the line table: it is description,
        not arithmetic, and nothing in it may look like a figure the total was
        computed from.
      */}
      {document.presentation ? (
        <section className="plan">
          <p className="label">
            {document.presentation.plan_name}
            {document.presentation.billing_period
              ? ` · ${document.presentation.billing_period}`
              : ''}
          </p>
          {document.presentation.tagline ? (
            <p className="plan-tagline">{document.presentation.tagline}</p>
          ) : null}
          {document.presentation.features?.length ? (
            <ul className="plan-features">
              {document.presentation.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          ) : null}
          {document.presentation.highlights?.length ? (
            <p className="plan-highlights">
              {document.presentation.highlights.join('  ·  ')}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="notes">
        <p>Pay via Khalti · eSewa · Bank transfer.</p>
        <p>{vatNote(document.seller.name)}</p>
      </div>

      <footer className="sheet-foot">
        <span>This is a computer-generated invoice.</span>
        <span className="num">{document.invoiceNo}</span>
      </footer>
    </article>
  );
}

/** `2026-08-25`. Deliberately ISO in the period column — it is a range, and a
 * range reads faster when both ends are the same fixed width. */
function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** `1.000` → `1`, `1.500` → `1.5`. The stored scale is 3; nobody reads that. */
function trimQuantity(quantity: string): string {
  return quantity.includes('.')
    ? quantity.replace(/0+$/, '').replace(/\.$/, '')
    : quantity;
}
