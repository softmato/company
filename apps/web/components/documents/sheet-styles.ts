/**
 * The stylesheet both documents are set in.
 *
 * **A plain string, not Tailwind classes, and that is deliberate.** This same
 * markup is rendered in three places: an admin page, a browser print dialog,
 * and a headless browser producing the PDF that gets attached to an email. The
 * third has no build pipeline and no `globals.css`, so a document that
 * depended on the app's utility classes would render correctly on screen and
 * arrive in the customer's inbox unstyled. A self-contained document travels.
 *
 * **White paper, black ink.** The app's ground is a faintly green near-white
 * (`--background: #fbfdfc`); a document is not. It is white, because it is
 * printed, photocopied, and read next to other invoices — and because
 * everything else on the page is trying to look like paper.
 *
 * Colour is spent in exactly one place: the status badge, whose palette is
 * fixed by the billing spec §5 (unpaid amber, part-paid blue, paid green,
 * overdue red, void grey). Amounts stay ink-black. That is the house rule from
 * docs/DESIGN.md §2 — an amount is never coloured for decoration — and on a
 * document it matters more, since a photocopy loses the colour and must lose
 * nothing that carried meaning.
 *
 * Geometry is the spec's: A4 with 20mm margins for the invoice, half-height
 * for the receipt so the two are distinguishable across a desk.
 */

export const SHEET_STYLES = `
:root {
  --doc-ink: #111514;
  --doc-ink-soft: #5b6a64;
  --doc-ink-faint: #8a9691;
  --doc-rule: #d9e0dc;
  --doc-rule-strong: #111514;
  --doc-paper: #ffffff;
  --doc-band: #f6f8f7;

  --doc-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --doc-display: 'DM Sans', var(--doc-sans);
  --doc-mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', 'Courier New', monospace;
}

.sheet-root {
  background: var(--doc-paper);
  color: var(--doc-ink);
  font-family: var(--doc-sans);
  font-size: 11px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* A4 with the spec's 20mm margins. The receipt overrides the width below. */
.sheet {
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 20mm;
  background: var(--doc-paper);
  position: relative;
  display: flex;
  flex-direction: column;
}

.sheet--receipt {
  width: 148mm;          /* A5 — "narrower than the invoice", spec §6 */
  min-height: 210mm;
  padding: 14mm;
}

/*
 * The receipt centres its title and left-aligns its meta block. The invoice
 * hangs both off the right edge because it has a seller block filling the
 * left; the receipt's header is two lines, so the same treatment would leave
 * the title floating in space.
 */
.sheet--receipt .doc-title {
  text-align: center;
  font-size: 15px;
  letter-spacing: 0.32em;
}

.sheet--receipt .meta {
  margin-left: 0;
  width: 100%;
}

.sheet--receipt .meta th { width: 34mm; }

/*
 * The receipt's party block sits directly above the AMOUNT RECEIVED band,
 * which draws its own top rule. Without this the two hairlines land 5mm apart
 * and read as a mistake rather than as a division.
 */
.sheet--receipt .parties { border-bottom: none; }

/* Every figure, id and date. Digits must align down a column. */
.num {
  font-family: var(--doc-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

/* ── Header ─────────────────────────────────────────────── */

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16mm;
  padding-bottom: 6mm;
  border-bottom: 1.5px solid var(--doc-rule-strong);
}

.seller-name {
  font-family: var(--doc-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 2px;
}

.seller-lines {
  margin: 0;
  color: var(--doc-ink-soft);
  font-size: 10px;
  line-height: 1.6;
}

.seller-lines span { display: block; }

.doc-title {
  font-family: var(--doc-display);
  /* The spec sets these letterspaced — I N V O I C E — so the word reads as a
     label rather than a heading, and stays legible at photocopy quality. */
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  text-align: right;
  margin: 0 0 4mm;
  white-space: nowrap;
}

.meta {
  border-collapse: collapse;
  margin-left: auto;
  font-size: 10px;
}

.meta th {
  text-align: left;
  font-weight: 400;
  color: var(--doc-ink-soft);
  padding: 1px 10px 1px 0;
  white-space: nowrap;
}

.meta td {
  text-align: right;
  padding: 1px 0;
  white-space: nowrap;
}

.meta .ad {
  color: var(--doc-ink-faint);
  font-size: 9px;
}

/* ── Parties ────────────────────────────────────────────── */

.parties {
  display: flex;
  gap: 10mm;
  padding: 5mm 0;
  border-bottom: 1px solid var(--doc-rule);
}

.parties > * { flex: 1; }

.party-status { flex: 0 0 62mm; text-align: right; }

.label {
  font-family: var(--doc-mono);
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--doc-ink-faint);
  margin: 0 0 2mm;
}

.party-name {
  font-weight: 600;
  font-size: 12px;
  margin: 0 0 1px;
}

.party-lines {
  margin: 0;
  color: var(--doc-ink-soft);
  font-size: 10px;
  line-height: 1.6;
}

.party-lines span { display: block; }

.absent {
  color: var(--doc-ink-faint);
  font-style: italic;
}

/* ── Status badge ───────────────────────────────────────── */

.badge {
  display: inline-block;
  padding: 2.4mm 6mm;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  font-family: var(--doc-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.badge--unpaid         { color: #a16207; }
.badge--partially_paid { color: #1d4ed8; }
.badge--paid           { color: #047857; }
.badge--past_due       { color: #a81e12; }
.badge--void           { color: #6b7280; }
.badge--written_off    { color: #6b7280; }

.badge-amount {
  margin: 3mm 0 0;
  font-size: 10px;
  color: var(--doc-ink-soft);
}

.badge-amount strong {
  display: block;
  font-family: var(--doc-mono);
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  color: var(--doc-ink);
  font-weight: 600;
}

/* ── Line items ─────────────────────────────────────────── */

.lines {
  width: 100%;
  border-collapse: collapse;
  margin-top: 6mm;
}

.lines thead th {
  font-family: var(--doc-mono);
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--doc-ink-faint);
  font-weight: 400;
  text-align: left;
  padding: 0 0 2mm;
  border-bottom: 1px solid var(--doc-rule-strong);
}

.lines td {
  padding: 3mm 0;
  vertical-align: top;
  border-bottom: 1px solid var(--doc-rule);
}

.lines .col-no    { width: 8mm; }
.lines .col-qty   { width: 16mm; text-align: right; }
.lines .col-rate  { width: 26mm; text-align: right; }
.lines .col-amt   { width: 30mm; text-align: right; }
.lines .col-period { width: 40mm; }

.line-period {
  color: var(--doc-ink-soft);
  font-size: 9.5px;
}

.line-period span { display: block; }

/* ── Totals ─────────────────────────────────────────────── */

.totals {
  margin: 5mm 0 0 auto;
  border-collapse: collapse;
  width: 84mm;
}

.totals th {
  text-align: left;
  font-weight: 400;
  color: var(--doc-ink-soft);
  padding: 1.6mm 0;
}

.totals td {
  text-align: right;
  padding: 1.6mm 0;
  white-space: nowrap;
}

.totals .rule td, .totals .rule th { border-top: 1px solid var(--doc-rule); padding-top: 0; }

.totals .grand th, .totals .grand td {
  border-top: 1.5px solid var(--doc-rule-strong);
  font-weight: 600;
  font-size: 12px;
  color: var(--doc-ink);
  padding-top: 2.4mm;
}

.totals .due th, .totals .due td {
  border-top: 3px double var(--doc-rule-strong);
  font-weight: 700;
  font-size: 13px;
  padding-top: 2.4mm;
}

/* ── What the SaaS is selling ───────────────────────────── */

/*
 * Integrator-supplied copy. Set smaller and softer than the line items on
 * purpose: it describes the purchase, it is not part of the arithmetic, and
 * nothing in it should be mistaken at a glance for a figure the total came
 * from. Two columns because a plan's feature list is short lines, and one
 * column of them down an A4 page wastes half the width.
 */
.plan {
  margin-top: 5mm;
  padding-top: 4mm;
  border-top: 1px solid var(--doc-rule);
}

.plan .label { margin-bottom: 1.5mm; color: var(--doc-ink-soft); }

.plan-tagline {
  margin: 0 0 2.5mm;
  font-size: 10px;
  color: var(--doc-ink-soft);
}

.plan-features {
  margin: 0;
  padding: 0 0 0 4mm;
  columns: 2;
  column-gap: 10mm;
  font-size: 10px;
  color: var(--doc-ink-soft);
  line-height: 1.6;
}

.plan-features li {
  /* A bullet split across the column break reads as two half-sentences. */
  break-inside: avoid;
  margin-bottom: 1mm;
}

.plan-highlights {
  margin: 2.5mm 0 0;
  font-size: 9.5px;
  color: var(--doc-ink-faint);
}

/* ── Words, notes, footer ───────────────────────────────── */

.words {
  margin: 6mm 0 0;
  padding: 3mm 0;
  border-top: 1px solid var(--doc-rule);
  border-bottom: 1px solid var(--doc-rule);
  font-size: 10.5px;
}

.words .label { display: inline; margin: 0 6px 0 0; }

.notes {
  margin-top: 6mm;
  font-size: 10px;
  color: var(--doc-ink-soft);
  line-height: 1.65;
}

.notes p { margin: 0 0 2.5mm; }

.sheet-foot {
  margin-top: auto;
  padding-top: 5mm;
  border-top: 1px solid var(--doc-rule);
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  font-size: 9px;
  color: var(--doc-ink-faint);
}

/* ── Receipt-specific ───────────────────────────────────── */

.received {
  text-align: center;
  padding: 7mm 0;
  border-top: 1px solid var(--doc-rule);
  border-bottom: 1px solid var(--doc-rule);
  margin: 5mm 0;
}

.received .label { margin-bottom: 3mm; }

.received-amount {
  font-family: var(--doc-mono);
  font-variant-numeric: tabular-nums;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}

.received-words {
  margin: 2.5mm 0 0;
  font-size: 10px;
  color: var(--doc-ink-soft);
}

.detail {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}

.detail th {
  text-align: left;
  font-weight: 400;
  color: var(--doc-ink-soft);
  padding: 1.6mm 0;
  width: 34mm;
  vertical-align: top;
}

.detail td { padding: 1.6mm 0; word-break: break-word; }

.settlement {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6mm;
  margin-top: 5mm;
  padding-top: 4mm;
  border-top: 1px solid var(--doc-rule);
}

/* Figures in the settlement block align on their decimal, like every other
   column of money in this product. */
.settlement .detail th { width: 30mm; }
.settlement .detail td { text-align: right; min-width: 26mm; }

/* ── Void watermark ─────────────────────────────────────── */

/*
 * Spec §5: a voided invoice keeps its number and is watermarked. It is drawn
 * behind the content and never over a figure so hard that the figure stops
 * being readable — a voided invoice still has to be auditable.
 */
.watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}

.watermark span {
  font-family: var(--doc-display);
  font-size: 96px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: rgba(107, 114, 128, 0.13);
  transform: rotate(-28deg);
  text-transform: uppercase;
}

.sheet > *:not(.watermark) { position: relative; z-index: 1; }

/* ── Warning banner (screen only) ───────────────────────── */

/*
 * Never printed and never in the PDF: it is addressed to whoever is looking at
 * the admin screen, not to the customer holding the paper.
 */
.sheet-warning {
  width: 210mm;
  margin: 0 auto 4mm;
  box-sizing: border-box;
  padding: 3mm 5mm;
  border: 1px solid #f0d38a;
  background: #fdf8ec;
  color: #7a5a12;
  font-family: var(--doc-sans);
  font-size: 11px;
  line-height: 1.55;
  border-radius: 3px;
}

.sheet-warning strong { display: block; margin-bottom: 1mm; }
.sheet-warning ul { margin: 1mm 0 0; padding-left: 5mm; }

@media print {
  .sheet-warning { display: none; }
  .sheet { margin: 0; }
}
`;
