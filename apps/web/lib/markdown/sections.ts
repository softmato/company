import { splitLede } from './lede';

/**
 * A CMS body cut at its `##` headings, so a page can set each section as its
 * own panel instead of one long column of prose. The opening paragraph comes
 * back separately, the same way `splitLede` gives it to a page header.
 */
export function splitSections(body: string | null | undefined): {
  lede: string | null;
  sections: { title: string; body: string }[];
} {
  const { lede, rest } = splitLede(body);
  if (!rest) return { lede, sections: [] };

  const [before, ...headed] = rest.split(/^## +/m);

  // Prose between the lede and the first heading is a section with no title.
  const sections = before?.trim() ? [{ title: '', body: before.trim() }] : [];

  for (const chunk of headed) {
    const breakAt = chunk.indexOf('\n');
    sections.push(
      breakAt === -1
        ? { title: chunk.trim(), body: '' }
        : {
            title: chunk.slice(0, breakAt).trim(),
            body: chunk.slice(breakAt + 1).trim(),
          },
    );
  }

  return { lede, sections };
}

/**
 * The first `limit` bullet points in a body, as plain short lines — the
 * checklist on a service card. Continuation lines are joined, `**bold**`
 * markers dropped, and anything after an em dash cut, because a bullet that
 * reads "**One codebase** — iOS and Android from…" is titled by its first half.
 */
export function bulletHighlights(
  body: string | null | undefined,
  limit = 3,
): string[] {
  const items: string[] = [];

  for (const line of (body ?? '').split('\n')) {
    if (/^[-*] +/.test(line)) items.push(line.replace(/^[-*] +/, ''));
    else if (items.length && /^ {2,}\S/.test(line))
      items[items.length - 1] += ` ${line.trim()}`;
  }

  return items
    .map((item) => item.replace(/\*\*/g, '').split(' — ')[0]!.trim())
    .filter(Boolean)
    .slice(0, limit);
}
