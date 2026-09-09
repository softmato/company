/**
 * What a new product's id may be.
 *
 * `products.id` is not an opaque key. It is a ledger dimension every P&L slice
 * is grouped by (docs/CHART_OF_ACCOUNTS.md §8), it is read by a human in the
 * admin, and `generateClientId` bakes it into every credential the product
 * ever issues:
 *
 *   app_live_questioncall_7fk2m9qz
 *
 * That last part is why the rules here are tighter than "any text". The id is
 * minted into issued client ids and into log lines, and a client id cannot be
 * changed after the fact — renaming a product would orphan every credential
 * that names it. So the shape is settled once, at creation, and the underscore
 * is refused specifically: it is the separator in the identifier above, and an
 * id containing one turns `app_live_question_call_7fk2m9qz` into a string
 * nobody can split back apart by eye.
 *
 * Kept out of `./manage.ts` so the rule can be tested without a database, and
 * so the registration path has one import that says what it is checking.
 */

/** Long enough to read, short enough to keep a client id scannable. */
const MIN_LENGTH = 2;
const MAX_LENGTH = 32;

/**
 * Lowercase alphanumerics, single hyphens between them. No leading or trailing
 * hyphen, no doubled hyphen, no underscore.
 */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The id an admin typed, or `null` if it is not one we will accept.
 *
 * Case and surrounding space are corrected rather than refused, because those
 * are typing accidents with one obvious intent. Everything else is refused
 * rather than repaired: silently turning `Question Call` into `question-call`
 * invents an identifier the admin never chose and then makes it permanent.
 */
export function normalizeProductId(value: string): string | null {
  const id = value.trim().toLowerCase();

  if (id.length < MIN_LENGTH || id.length > MAX_LENGTH) return null;
  if (!SLUG.test(id)) return null;

  return id;
}

/**
 * Why a given id was refused, for a form that has to say something better than
 * "invalid". Returns `null` when the id is acceptable.
 */
export function explainProductId(value: string): string | null {
  const id = value.trim().toLowerCase();

  if (id === '') return 'Give the product an id.';

  if (id.length < MIN_LENGTH || id.length > MAX_LENGTH) {
    return `The id is ${MIN_LENGTH}–${MAX_LENGTH} characters.`;
  }

  if (id.includes('_')) {
    return 'No underscores — that is the separator inside a client id. Use a hyphen.';
  }

  if (!SLUG.test(id)) {
    return 'Lowercase letters, digits and single hyphens only — "question-call", not "Question Call".';
  }

  return null;
}
