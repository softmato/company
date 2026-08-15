/**
 * Section headings pulled out of a markdown body, for a table of contents.
 *
 * A legal document is long and read by someone looking for one clause. Parsing
 * the body is cheaper than a second stored field that can drift out of step
 * with the text it describes.
 *
 * Only `##` is collected: `#` is the document title, already on the page, and
 * `###` is detail inside a section rather than a place to jump to.
 */
export interface Heading {
  id: string;
  text: string;
}

/** Stable, URL-safe, and derived only from the text — same input, same anchor. */
export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  );
}

export function extractHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Set<string>();

  for (const line of body.split('\n')) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match?.[1]) continue;

    // Strip the markdown a heading might carry — `**1. Fees**` reads as text.
    const text = match[1].replace(/[*_`]/g, '').trim();
    if (!text) continue;

    const base = headingId(text);
    let id = base;
    // Two sections with the same name would otherwise share an anchor.
    for (let n = 2; seen.has(id); n += 1) id = `${base}-${n}`;
    seen.add(id);

    headings.push({ id, text });
  }

  return headings;
}
