/**
 * Turning prose into comparable terms.
 *
 * Deliberately small and dependency-free. This is the layer a real embedding
 * model would replace — see `search.ts` for what that migration looks like —
 * so it stays easy to delete.
 */

/**
 * Words carrying no retrieval signal. Kept short on purpose: an aggressive
 * stopword list starts eating domain terms, and "how much does it cost" loses
 * its meaning if "how much" goes.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'do',
  'does', 'for', 'from', 'get', 'had', 'has', 'have', 'i', 'if', 'in', 'is',
  'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'so', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'us', 'was',
  'we', 'were', 'what', 'when', 'which', 'will', 'with', 'you', 'your',
]);

/**
 * Terms a visitor uses mapped to terms the knowledge base uses.
 *
 * This is the cheap stand-in for semantic similarity. A visitor asking "how
 * much do you charge" shares no literal token with a document that says
 * "pricing tiers" and "quote", and pure lexical matching would return nothing
 * useful. Each entry earns its place by being a question really asked.
 */
const SYNONYMS: Record<string, string[]> = {
  cost: ['price', 'pricing', 'quote', 'rate', 'fee', 'budget'],
  charge: ['price', 'pricing', 'fee', 'rate'],
  cheap: ['price', 'pricing', 'budget'],
  expensive: ['price', 'pricing', 'budget'],
  price: ['pricing', 'quote', 'cost', 'tier'],
  money: ['price', 'pricing', 'cost'],

  app: ['mobile', 'application', 'ios', 'android'],
  site: ['web', 'website', 'static'],
  website: ['web', 'site', 'static'],
  web: ['website', 'application'],

  meet: ['meeting', 'call', 'discovery', 'booking', 'slot'],
  meeting: ['call', 'discovery', 'booking', 'slot'],
  call: ['meeting', 'discovery', 'booking', 'slot'],
  book: ['booking', 'meeting', 'slot', 'schedule'],
  schedule: ['booking', 'slot', 'meeting'],
  talk: ['contact', 'meeting', 'call'],

  who: ['founder', 'team', 'leadership'],
  boss: ['founder', 'ceo', 'cto', 'leadership'],
  owner: ['founder', 'ceo', 'leadership'],
  staff: ['team', 'engineer'],

  safe: ['security', 'nda', 'confidentiality'],
  secure: ['security', 'nda', 'policy'],
  contract: ['nda', 'terms', 'policy', 'ip'],
  legal: ['policy', 'terms', 'nda', 'compliance'],

  fast: ['timeline', 'delivery', 'schedule'],
  long: ['timeline', 'delivery'],
  time: ['timeline', 'delivery'],
  when: ['timeline', 'delivery'],

  work: ['portfolio', 'project', 'case'],
  built: ['portfolio', 'project', 'case'],
  example: ['portfolio', 'case', 'project'],
  experience: ['portfolio', 'case'],

  payment: ['esewa', 'khalti', 'fonepay', 'gateway'],
  pay: ['payment', 'gateway'],
};

/**
 * A crude suffix strip, so "services" matches "service" and "pricing"
 * matches "price". Not a real stemmer — Porter would be more correct and more
 * weight than a six-file knowledge base can justify.
 */
function stem(word: string): string {
  if (word.length <= 4) return word;

  /*
   * Order matters: longest suffix first, so "confidentiality" loses "ity"
   * rather than "s". That pair is why the list grew past plurals — a visitor
   * asks "is my idea kept confidential" and the policy document says
   * "confidentiality", which shares no token until -ity comes off.
   */
  let base = word;

  for (const suffix of ['ality', 'ility', 'ness', 'ment', 'ies', 'ing', 'ity', 'es', 's']) {
    if (!word.endsWith(suffix)) continue;
    if (word.length - suffix.length < 4) continue;

    const trimmed = word.slice(0, -suffix.length);
    if (suffix === 'ies') return `${trimmed}y`;
    if (suffix === 'ality' || suffix === 'ility') return `${trimmed}al`;
    base = trimmed;
    break;
  }

  /*
   * Drop a silent trailing -e so the stripped and unstripped forms of a word
   * land on the same term. Without it "services" stems to "servic" while
   * "service" stays whole and the two never match — the plural handling
   * defeating itself on exactly the words it was added for.
   */
  if (base.length > 4 && base.endsWith('e')) {
    base = base.slice(0, -1);
  }

  return base;
}

/** Lowercased, punctuation-free, stopword-free, stemmed terms. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

/**
 * Query terms plus their synonyms.
 *
 * Expansions are returned separately so the scorer can weight them below a
 * literal hit — "pricing" in the query should beat "pricing" inferred from
 * "cheap".
 */
export function expandQuery(query: string): { terms: string[]; expanded: string[] } {
  const raw = query.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  const terms = tokenize(query);

  const expanded = new Set<string>();
  for (const word of raw) {
    for (const synonym of SYNONYMS[word] ?? []) {
      expanded.add(stem(synonym));
    }
  }
  for (const term of terms) expanded.delete(term);

  return { terms, expanded: [...expanded] };
}
