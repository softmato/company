import { isProductionSite } from './site';

/**
 * Renders a JSON-LD block into the page.
 *
 * Two things this does that a bare `JSON.stringify` into a script tag does
 * not:
 *
 *   1. **It escapes `<`.** Structured data is built from CMS text the founder
 *      types. A post excerpt containing `</script>` would otherwise close the
 *      tag early and put the rest of the excerpt into the document as markup —
 *      an XSS hole authored through the admin panel. `<` is valid inside
 *      a JSON string and parses back to the same character.
 *   2. **It stays off non-production deployments.** Organization markup on a
 *      preview URL tells a crawler the company is located there, which is the
 *      leak robots.ts exists to prevent, one layer further in.
 *
 * `id` must be unique within the page; React uses it as the key when two
 * blocks are rendered next to each other.
 */
export function JsonLd({ id, data }: { id: string; data: unknown }) {
  if (!isProductionSite()) return null;
  if (data === null || data === undefined) return null;

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }}
    />
  );
}

/**
 * JSON with every `<` escaped, so no value can terminate the script tag.
 *
 * Exported for the test that proves it: this is the one line standing between
 * a founder pasting `</script>` into a post excerpt and that excerpt executing
 * as markup on every page the post appears on.
 */
export function serialiseJsonLd(data: unknown): string {
  /*
   * The backslash is doubled on purpose. With a single backslash,
   * TypeScript resolves the escape at compile time and this line replaces
   * `<` with `<` — a silent no-op that leaves the hole wide open. The
   * output has to carry the literal characters, so the HTML parser never
   * sees a `<` inside the script body at all.
   */
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Drops keys whose value is null, undefined or an empty string.
 *
 * Structured data is read by machines that treat `"telephone": ""` as a claim
 * that the phone number is the empty string. Every builder in this folder runs
 * its output through here, so a contact detail the founder has not filled in
 * is absent rather than blank — the same rule the footer follows.
 */
export function compact<T extends Record<string, unknown>>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0),
    ),
  ) as T;
}
