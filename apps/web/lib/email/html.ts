/**
 * The one HTML shell every Softmato email is built from (docs/DESIGN.md §1).
 *
 * Colours are hex literals rather than the `globals.css` tokens on purpose:
 * mail clients support neither custom properties nor `oklch()`, and a colour
 * that fails to parse in Outlook is a black-on-black email. These are the
 * closest sRGB equivalents of `--foreground`, `--primary`, `--muted-foreground`,
 * `--border` and `--surface-strong`. If the palette moves, move these with it.
 *
 * Pure string work, no `server-only`: the tests render templates directly.
 */

const INK = '#1c1917';
const EMERALD = '#0f7a5f';
const MUTED = '#79716b';
const BORDER = '#e7e5e4';
const PAPER = '#fff8ef';

/**
 * Escapes text for HTML.
 *
 * Every value passing through here came from a stranger filling in a public
 * form. An unescaped `<` in a name is how a contact enquiry becomes a phishing
 * email sent from our own domain.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes, then keeps the line breaks the writer typed. */
export function paragraph(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

export interface DetailRow {
  label: string;
  value: string;
}

function rowsTable(rows: DetailRow[]): string {
  const cells = rows
    .map(
      ({ label, value }) => `
      <tr>
        <td style="padding:10px 16px 10px 0;font-size:13px;color:${MUTED};white-space:nowrap;border-bottom:1px solid ${BORDER};">${escapeHtml(label)}</td>
        <td style="padding:10px 0;font-size:13px;color:${INK};border-bottom:1px solid ${BORDER};">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');

  return `<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 28px 0;">${cells}</table>`;
}

export interface LayoutOptions {
  /** Small uppercase label above the heading (docs/DESIGN.md §1). */
  eyebrow: string;
  heading: string;
  rows?: DetailRow[];
  /** Already-escaped HTML. Use `paragraph()` to build it. */
  body?: string;
  footer: string;
}

export function layout({
  eyebrow,
  heading,
  rows,
  body,
  footer,
}: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:32px 16px;background:${PAPER};">
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:520px;border-collapse:collapse;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
            <tr>
              <td style="padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:${INK};">
                <p style="margin:0 0 28px 0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${EMERALD};font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 24px 0;font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${INK};">${escapeHtml(heading)}</h1>
                ${rows?.length ? rowsTable(rows) : ''}
                ${body ? `<div style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:${INK};">${body}</div>` : ''}
                <p style="margin:0;padding-top:20px;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};">${escapeHtml(footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
