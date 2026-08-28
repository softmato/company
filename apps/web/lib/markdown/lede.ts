/**
 * Splits a markdown body into its opening paragraph and everything after it.
 *
 * The home page sets the lede in large type beside the hero and renders the
 * rest as prose. Doing that by slicing the stored body — rather than adding a
 * `lede` column — keeps one editable field per page: a founder writes the
 * page top to bottom and the first paragraph is the lede by position, which
 * is what "first paragraph" means to the person typing it.
 *
 * A body that opens with a heading has no lede. Returning the whole thing as
 * `rest` is deliberate: promoting a heading into a paragraph of large grey
 * text would silently restructure someone's page.
 */
export function splitLede(body: string | null | undefined): {
  lede: string | null;
  rest: string | null;
} {
  if (!body) return { lede: null, rest: null };

  const trimmed = body.trim();
  if (trimmed.startsWith('#')) return { lede: null, rest: trimmed };

  const breakAt = trimmed.search(/\n\s*\n/);
  if (breakAt === -1) return { lede: collapse(trimmed), rest: null };

  return {
    lede: collapse(trimmed.slice(0, breakAt)),
    rest: trimmed.slice(breakAt).trim() || null,
  };
}

/** Soft line breaks inside a paragraph are wrapping, not structure. */
function collapse(paragraph: string): string {
  return paragraph.replace(/\s*\n\s*/g, ' ').trim();
}
