/**
 * Resolves `{{setting.key}}` placeholders in CMS bodies.
 *
 * The legal documents name the company, its registered address, and the
 * mailboxes people are told to write to. Every one of those is a fact the
 * founder edits in the admin panel, so none may be frozen into a document
 * body: a phone number changed in `platform_settings` but not in the Terms of
 * Service is a policy that lies about how to reach us, and nobody finds out
 * until someone tries.
 *
 * Pure — no database, no `server-only`, no path aliases — so the same function
 * runs in the public page, in `scripts/check-legal.mts` before a deploy, and
 * in tests. Same argument as `legal-readiness.ts`, which it is designed to
 * work with.
 *
 * ## Required and optional
 *
 * `{{company.address}}` is **required**. Blank, it resolves to
 * `[confirm: Registered address]` rather than to nothing — deliberately, and
 * it is the whole safety property: `[confirm:` is already the marker
 * `legalReadiness()` treats as blocking, so an unfilled address keeps its
 * document out of the search index under the rule that was there before this
 * file existed. Rendering blank as nothing would produce a policy with a
 * silent hole in it: reachable, indexable, and wrong.
 *
 * `{{company.pan?}}` is **optional**. Blank, its whole line disappears. That
 * exists because some identity facts are a choice rather than a duty — Nepal
 * has no Impressum rule obliging a company to print its PAN or registration
 * number on a website — and a founder who leaves those blank should get a
 * clean contact block, not a blocked document.
 */
import { definitionFor, type Settings } from '../settings/registry';

/**
 * `{{group.key}}` or `{{group.key?}}`, tolerant of inner whitespace.
 *
 * Deliberately narrow: lowercase, dotted, at least one dot. It will not match
 * a stray `{{` in prose, and it cannot be steered at anything that is not a
 * settings key.
 */
const TOKEN = /\{\{\s*([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)(\?)?\s*\}\}/g;

/** What an unresolved required token leaves behind, in the shape readiness blocks on. */
function unresolved(label: string): string {
  return `[confirm: ${label}]`;
}

/**
 * The saved value, or `undefined` where the key has no definition.
 *
 * `settings.text()` throws on an unknown key, so a typo in seeded markdown
 * would otherwise crash a public page. It is caught here and reported in the
 * text instead, because a visible wrong token is easier to find than a 500.
 */
function valueFor(key: string, settings: Settings): string | undefined {
  return definitionFor(key) ? settings.text(key).trim() : undefined;
}

export function resolveTokens(body: string, settings: Settings): string {
  /*
   * Optional tokens are resolved a line at a time, because a blank one has to
   * take its label with it. `PAN: {{company.pan?}}` left as `PAN:` would be
   * worse than either showing the number or omitting the line.
   */
  const kept = body.split('\n').filter((line) => {
    let drop = false;

    for (const match of line.matchAll(TOKEN)) {
      if (match[2] === undefined) continue;
      if (valueFor(match[1]!, settings) === '') drop = true;
    }

    return !drop;
  });

  return kept.join('\n').replace(TOKEN, (_match, key: string) => {
    const value = valueFor(key, settings);

    // A token naming a setting that does not exist is a bug in the document,
    // not something a founder can fix in the panel. Say so in the text.
    if (value === undefined) return unresolved(`unknown setting ${key}`);

    if (value !== '') return value;

    return unresolved(definitionFor(key)?.label ?? key);
  });
}

/**
 * The settings a body depends on, in the order they appear.
 *
 * Lets the admin panel answer "what breaks if I blank this?" and lets
 * `legal:todo` list the facts still needed by name rather than by grep.
 */
export function tokensIn(body: string): { key: string; optional: boolean }[] {
  const seen = new Map<string, boolean>();

  for (const match of body.matchAll(TOKEN)) {
    const key = match[1]!;

    // A key used both ways is reported as required: the strict use decides.
    seen.set(key, (seen.get(key) ?? true) && match[2] !== undefined);
  }

  return [...seen].map(([key, optional]) => ({ key, optional }));
}
