/**
 * The pieces both documents are built from.
 *
 * Server components with no interactivity — a document has no state, and one
 * that shipped a client bundle to render a PDF would be paying for a runtime
 * that is never used.
 */
import { formatAd, formatBs } from '@/lib/format/date';
import type { DocumentStatus, Party } from '@/lib/documents/types';

/** What the badge says. Reader's words, not the enum's. */
const STATUS_LABEL: Record<DocumentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Part paid',
  paid: 'Paid',
  past_due: 'Overdue',
  void: 'Void',
  written_off: 'Written off',
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
  );
}

/**
 * A date the way this platform states dates: BS on top, AD beneath in smaller
 * type (docs/DESIGN.md §5, billing spec §5).
 *
 * Both are printed rather than one, because the customer files by BS and the
 * gateway statement they will reconcile against is in AD.
 */
export function DocumentDate({ value }: { value: Date }) {
  return (
    <>
      <span className="num">{formatBs(value)} BS</span>
      <span className="ad num"> ({formatAd(value)})</span>
    </>
  );
}

/**
 * A party block — us in the header, the customer under BILL TO.
 *
 * An absent field is rendered as an explicit "not recorded" rather than being
 * dropped. A silently missing PAN looks the same as a customer who has none,
 * and only one of those is something to go and fix.
 */
export function PartyBlock({
  label,
  party,
  showAbsentPan = false,
}: {
  label: string;
  party: Party;
  /** Businesses must show a PAN; individuals need not have one (spec §5). */
  showAbsentPan?: boolean;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="party-name">{party.name}</p>
      <p className="party-lines">
        {party.address ? <span>{party.address}</span> : null}
        {party.pan ? (
          <span className="num">PAN: {party.pan}</span>
        ) : showAbsentPan ? (
          <span className="absent">PAN not recorded</span>
        ) : null}
        {party.email ? <span>{party.email}</span> : null}
        {party.phone ? <span className="num">{party.phone}</span> : null}
      </p>
    </div>
  );
}

/**
 * The single sentence that does the whole of our VAT compliance on this page.
 *
 * Billing spec §5 is precise about this and the precision is the point: we
 * state that no VAT is charged, and we never print a `VAT: 0%` row, because a
 * zero-rate line implies a registration Softmato does not hold.
 *
 * It takes the seller's name rather than hardcoding one. The name at the top
 * of the document comes from `company.legal_name` and reads "Softmato
 * Technology Private Limited"; a footer that said "Pvt. Ltd." instead was two
 * different entities naming themselves on one page, which is exactly the kind
 * of small inconsistency that makes a reader doubt a financial document.
 */
export function vatNote(sellerName: string): string {
  return (
    `${sellerName} is PAN-registered and is not registered for VAT. ` +
    'No VAT is charged on this document.'
  );
}

/**
 * Screen-only banner naming what is missing or provisional about this render.
 *
 * It exists so the gaps are impossible to miss on the admin screen and equally
 * impossible to leak onto the customer's copy — `@media print` removes it, and
 * the PDF builder never includes it.
 */
export function SheetWarning({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="sheet-warning">
      <strong>This document is not complete.</strong>
      <ul>
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}
