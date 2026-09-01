/**
 * Ranking knowledge chunks against a question.
 *
 * ## Why BM25 and not embeddings
 *
 * Vector search is the right end state and is not this. It needs an embedding
 * call on every query (latency on the chat path), a store to keep vectors in,
 * and a re-index step on every knowledge edit. For six Markdown files and a
 * vocabulary the founders control, BM25 over heading-aware chunks is close to
 * the same answers for none of that.
 *
 * The seam is deliberate: replacing this file with an embedding lookup means
 * satisfying `rankChunks(query, chunks) -> ScoredChunk[]` and nothing else.
 * `selectWithinBudget` and the chunker stay as they are.
 */

import type { KnowledgeChunk } from './chunk';
import { expandQuery, tokenize } from './tokenize';

export interface ScoredChunk {
  chunk: KnowledgeChunk;
  score: number;
}

/** BM25 term-frequency saturation. Standard default. */
const K1 = 1.2;
/** BM25 length normalisation. Standard default. */
const B = 0.75;

/** A synonym hit counts, but never as much as the visitor's own word. */
const EXPANSION_WEIGHT = 0.45;

/** A term in the heading trail is a strong signal about what a section is. */
const HEADING_BOOST = 1.8;

export interface ChunkIndex {
  chunks: KnowledgeChunk[];
  /** Chunk index → term → count. */
  frequencies: Array<Map<string, number>>;
  /** Chunk index → heading terms. */
  headingTerms: Array<Set<string>>;
  /** Term → number of chunks containing it. */
  documentFrequency: Map<string, number>;
  /** Chunk index → token count. */
  lengths: number[];
  averageLength: number;
}

export function buildIndex(chunks: KnowledgeChunk[]): ChunkIndex {
  const frequencies: Array<Map<string, number>> = [];
  const headingTerms: Array<Set<string>> = [];
  const documentFrequency = new Map<string, number>();
  const lengths: number[] = [];

  for (const chunk of chunks) {
    const terms = tokenize(chunk.body);
    const counts = new Map<string, number>();

    for (const term of terms) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
    for (const term of counts.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }

    frequencies.push(counts);
    headingTerms.push(new Set(tokenize(chunk.heading)));
    lengths.push(terms.length);
  }

  const total = lengths.reduce((sum, n) => sum + n, 0);

  return {
    chunks,
    frequencies,
    headingTerms,
    documentFrequency,
    lengths,
    averageLength: lengths.length > 0 ? total / lengths.length : 0,
  };
}

function idf(index: ChunkIndex, term: string): number {
  const n = index.chunks.length;
  const df = index.documentFrequency.get(term) ?? 0;
  // Standard BM25 IDF, floored so a term in almost every chunk cannot go
  // negative and start penalising the chunks that contain it.
  return Math.max(0.01, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
}

/**
 * `isExpansion` damps the heading boost, and this is load-bearing.
 *
 * "how much does a custom SaaS platform cost" expands `cost` to `quote`,
 * which lands in the heading "How Project Quotes Work" — and at full boost
 * that generic section outranked the tier that actually describes SaaS
 * pricing. An inferred word is evidence about a section's topic; it is much
 * weaker evidence than a word the visitor typed.
 */
function scoreTerm(index: ChunkIndex, docId: number, term: string, isExpansion: boolean): number {
  const frequency = index.frequencies[docId]?.get(term) ?? 0;
  const inHeading = index.headingTerms[docId]?.has(term) ?? false;

  if (frequency === 0 && !inHeading) return 0;

  const length = index.lengths[docId] ?? 0;
  const normalised = K1 * (1 - B + (B * length) / (index.averageLength || 1));
  const saturated = (frequency * (K1 + 1)) / (frequency + normalised);

  const boost = inHeading ? (isExpansion ? HEADING_BOOST * 0.25 : HEADING_BOOST) : 0;

  return idf(index, term) * (saturated + boost);
}

/** Chunks ranked most relevant first. Zero-scoring chunks are dropped. */
export function rankChunks(query: string, index: ChunkIndex): ScoredChunk[] {
  const { terms, expanded } = expandQuery(query);
  if (terms.length === 0 && expanded.length === 0) return [];

  const scored: ScoredChunk[] = [];

  for (let docId = 0; docId < index.chunks.length; docId += 1) {
    let score = 0;
    for (const term of terms) score += scoreTerm(index, docId, term, false);
    for (const term of expanded) score += EXPANSION_WEIGHT * scoreTerm(index, docId, term, true);

    if (score > 0) {
      scored.push({ chunk: index.chunks[docId]!, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

export interface BudgetOptions {
  /** Hard ceiling on characters of knowledge in the prompt. */
  maxChars: number;
  /** Ceiling on chunks, whatever the budget allows. */
  maxChunks: number;
  /** Ceiling per source file, so one document cannot crowd out the rest. */
  maxPerFile: number;
}

/**
 * Take the best chunks that fit.
 *
 * The per-file cap is what stops a question with a word common to one
 * document — "app", say — returning six chunks of `services.md` and nothing
 * from `pricing.md`, when the visitor plainly wanted both.
 */
export function selectWithinBudget(ranked: ScoredChunk[], options: BudgetOptions): ScoredChunk[] {
  const selected: ScoredChunk[] = [];
  const perFile = new Map<string, number>();
  let used = 0;

  for (const candidate of ranked) {
    if (selected.length >= options.maxChunks) break;

    const { filename, text } = candidate.chunk;
    const taken = perFile.get(filename) ?? 0;
    if (taken >= options.maxPerFile) continue;

    if (used + text.length > options.maxChars) {
      // A later chunk may still fit — keep looking rather than stopping dead.
      continue;
    }

    selected.push(candidate);
    perFile.set(filename, taken + 1);
    used += text.length;
  }

  return selected;
}
