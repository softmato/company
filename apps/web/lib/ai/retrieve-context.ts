/**
 * Choosing what the model gets to see.
 *
 * ## What changed and why
 *
 * The previous implementation matched a *file* on keywords and then sent that
 * file's first 650 characters. Two things were wrong with it. The answer to a
 * question is rarely in a document's opening lines, so "how much for a mobile
 * app?" reliably returned `pricing.md`'s title and preamble rather than the
 * tier that answers it. And with no real budget, three files of preamble went
 * into every prompt whether or not any of it was relevant.
 *
 * Retrieval now works on heading-scoped chunks, ranked by BM25 with synonym
 * expansion, and capped by a character budget. The model sees three or four
 * sections that bear on the question instead of the top of six documents.
 *
 * The next step is embeddings, and the seam for it is `rankChunks` in
 * `knowledge/search.ts` — nothing else here needs to know.
 */

import { getIndex } from './knowledge/load';
import { rankChunks, selectWithinBudget } from './knowledge/search';
import type { RetrievedContext } from './types';

/**
 * Characters of knowledge allowed into one prompt.
 *
 * Roughly 500 tokens. The ceiling exists because a chat reply is charged per
 * token on every turn and the assistant is answering short questions — not
 * because more context would not help. Raise it if answers start reading thin;
 * do not remove it.
 */
const MAX_CONTEXT_CHARS = 2_000;

/** A greeting needs identity, not the price list. */
const GREETING_RE =
  /^(hi|hello|hey|greetings|sup|hola|yo|howdy|namaste|good\s?(morning|evening|afternoon))\b/i;

/**
 * The one thing worth saying when there is nothing to retrieve.
 * Kept in step with `knowledge/company.md`; it is the fallback, not a source.
 */
const IDENTITY_FALLBACK =
  'Softmato Technology Pvt Ltd — a software product engineering agency in Kathmandu, Nepal, building web applications, mobile apps and SaaS platforms. Founded and equally led by Jiwan Mijhar (Founder & CEO) and Siddhant Yadav (Founder & CTO).';

/**
 * Knowledge relevant to `query`, largest-signal first.
 *
 * `maxResults` caps chunks, not files — several chunks may come from one
 * document when that document is where the answer lives.
 */
export async function retrieveContext(
  query: string,
  maxResults = 4,
): Promise<RetrievedContext[]> {
  const trimmed = query.trim();

  // A bare "hey" carries no terms worth ranking, and answering it does not
  // need the knowledge base. Sending the company overview and nothing else
  // keeps the greeting turn cheap.
  if (GREETING_RE.test(trimmed) && trimmed.length < 30) {
    return [identityContext()];
  }

  const index = getIndex();
  const ranked = rankChunks(trimmed, index);

  const selected = selectWithinBudget(ranked, {
    maxChars: MAX_CONTEXT_CHARS,
    maxChunks: maxResults,
    maxPerFile: 2,
  });

  if (selected.length === 0) {
    return [identityContext()];
  }

  return selected.map(({ chunk, score }) => ({
    filename: chunk.filename,
    content: chunk.text,
    score: Number(score.toFixed(3)),
  }));
}

function identityContext(): RetrievedContext {
  const index = getIndex();
  const overview = index.chunks.find((c) => c.filename === 'company.md');

  return {
    filename: 'company.md',
    content: overview ? overview.text.slice(0, 600) : IDENTITY_FALLBACK,
    score: 1,
  };
}
