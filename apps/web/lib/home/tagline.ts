/**
 * The one line that sits under the arc on the home page.
 *
 * The hero's light-form already spells the company name, so the `home` page
 * row's `title` — which is just "Softmato" — cannot also be the line beneath
 * it. What the hero needs is a tagline, and the CMS has no `tagline` field on
 * `pages`.
 *
 * Rather than add a field nobody would think to fill, this reads the one a
 * founder already writes a tagline into: `metaTitle`, which by convention on
 * this site is "<name> — <what the company does>". Everything after the dash
 * is the tagline. It is founder-edited, it is already reviewed as public copy,
 * and it is the same sentence Google shows.
 *
 * Falls back to the page title, so a `metaTitle` that is blank or does not
 * follow the convention leaves a hero that is plain rather than empty.
 */
export function homeTagline(title: string, metaTitle?: string | null): string {
  if (!metaTitle) return title;

  /* Em dash, en dash or hyphen — a founder will type whichever their keyboard offers. */
  const [, tail] = metaTitle.split(/\s+[—–-]\s+/, 2);

  return tail?.trim() || title;
}
