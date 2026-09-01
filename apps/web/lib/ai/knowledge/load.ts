/**
 * Loading the knowledge base off disk and indexing it once.
 *
 * The index is built lazily on first query and held for the life of the
 * process. Building it is cheap — six files, a few dozen chunks — but doing
 * it per request would put file I/O on the chat path for no gain, since the
 * files only change on deploy.
 */

import fs from 'node:fs';
import path from 'node:path';

import { chunkMarkdown, type KnowledgeChunk } from './chunk';
import { buildIndex, type ChunkIndex } from './search';

/**
 * The knowledge base, in load order.
 *
 * Named explicitly rather than globbed so a stray Markdown file dropped in
 * the folder cannot silently become something the assistant tells clients.
 */
export const KNOWLEDGE_FILES = [
  'company.md',
  'services.md',
  'pricing.md',
  'portfolio.md',
  'policies.md',
  'booking.md',
  'faq.md',
] as const;

/**
 * Where the Markdown lives.
 *
 * `apps/web/knowledge` is the single source. There used to be a byte-identical
 * copy at the repo root and a resolver that tried four locations in order —
 * so editing the root copy changed nothing at runtime (the app's cwd is
 * `apps/web`, which matched first) while looking for all the world like it
 * had. One directory, resolved from this file rather than from cwd, so a
 * script invoked from elsewhere in the monorepo reads the same files the app
 * does.
 */
function knowledgeDir(): string {
  // The repo-root form is checked FIRST and deliberately. A stale duplicate
  // still sits at `<repo>/knowledge`; checking `cwd/knowledge` first would
  // mean a script run from the root silently read that copy while the app
  // read this one — the exact split-brain this consolidation removes.
  const fromRepoRoot = path.resolve(process.cwd(), 'apps', 'web', 'knowledge');
  if (fs.existsSync(fromRepoRoot)) return fromRepoRoot;

  // The app's own cwd is `apps/web`, so this is the normal runtime path.
  return path.resolve(process.cwd(), 'knowledge');
}

let cached: ChunkIndex | null = null;

export function loadChunks(): KnowledgeChunk[] {
  const dir = knowledgeDir();
  const chunks: KnowledgeChunk[] = [];

  for (const filename of KNOWLEDGE_FILES) {
    try {
      const content = fs.readFileSync(path.join(dir, filename), 'utf-8');
      chunks.push(...chunkMarkdown(filename, content));
    } catch (err) {
      // A missing file degrades retrieval; it must not take down the chat.
      console.error(`[knowledge] could not read ${filename}:`, err);
    }
  }

  return chunks;
}

export function getIndex(): ChunkIndex {
  cached ??= buildIndex(loadChunks());
  return cached;
}

/** Test seam, and a hook for a future watch-mode reload in development. */
export function resetIndex(): void {
  cached = null;
}
