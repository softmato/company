/**
 * Splitting knowledge Markdown into retrievable pieces.
 *
 * ## Why this exists
 *
 * The retriever it replaces did `content.slice(0, 650)` — it picked a *file*
 * by keyword, then sent the file's opening 650 characters. So "how much for a
 * mobile app?" matched `pricing.md` and then handed the model that file's
 * title and preamble, while the tier that actually answers the question sat
 * at character 900 and was never seen. Every answer was drawn from the top of
 * a document regardless of what was asked.
 *
 * Chunking at headings fixes the relevance problem and the volume problem at
 * once: the unit of retrieval becomes the section that answers a question,
 * and the prompt carries three of those instead of six whole files.
 */

export interface KnowledgeChunk {
  /** Source file, e.g. `pricing.md`. */
  filename: string;
  /** Heading trail, e.g. `Pricing > Project Tiers > Advanced Web & SaaS`. */
  heading: string;
  /** The section body, headings excluded. */
  body: string;
  /** `heading` + `body` — what actually reaches the prompt. */
  text: string;
}

/** Sections longer than this are split again at paragraph boundaries. */
const MAX_CHUNK_CHARS = 700;

/** Below this a section is folded into its neighbour rather than stranded. */
const MIN_CHUNK_CHARS = 80;

function headingTrail(stack: string[]): string {
  return stack.filter(Boolean).join(' > ');
}

/**
 * Split an oversized section on blank lines, never mid-sentence.
 *
 * List-heavy sections are the common case — a tier with eight bullets — so
 * accumulating whole lines matters more than hitting the size target exactly.
 */
function splitLongBody(body: string): string[] {
  if (body.length <= MAX_CHUNK_CHARS) return [body];

  const parts: string[] = [];
  let current = '';

  for (const paragraph of body.split(/\n{2,}/)) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length > MAX_CHUNK_CHARS && current) {
      parts.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) parts.push(current);
  return parts;
}

/**
 * Markdown to chunks, one per heading section.
 *
 * The heading trail is carried into the chunk text rather than dropped. A
 * bare bullet list reading "Best for: Marketing sites…" is ambiguous on its
 * own; prefixed with "Pricing > Static Web Tier" it answers a pricing
 * question without the model having to infer where it came from.
 */
export function chunkMarkdown(filename: string, content: string): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  const stack: string[] = [];
  let buffer: string[] = [];

  /*
   * Normalise line endings before anything looks at them.
   *
   * A file saved with CRLF leaves a trailing carriage return on every line
   * after a split on newline — and a carriage return is a *line terminator*
   * to JS regex, so `.*$` in the heading pattern can never reach the end of
   * such a line and no heading matches at all. The document then collapses
   * into a single unchunked blob that blows the prompt budget and retrieves
   * nothing useful.
   *
   * It fails silently and completely, and on a Windows team it is a matter of
   * time, so it is handled here rather than trusted to editor settings.
   */
  const normalised = content.replace(/\r\n?/g, '\n');

  const flush = () => {
    const body = buffer.join('\n').trim();
    buffer = [];
    if (!body) return;

    const heading = headingTrail(stack);

    for (const part of splitLongBody(body)) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Fold a scrap into the previous chunk from the same heading rather
      // than emitting a chunk too small to answer anything.
      const previous = chunks[chunks.length - 1];
      if (trimmed.length < MIN_CHUNK_CHARS && previous?.heading === heading) {
        previous.body = `${previous.body}\n${trimmed}`;
        previous.text = `${heading}\n${previous.body}`;
        continue;
      }

      chunks.push({
        filename,
        heading,
        body: trimmed,
        text: heading ? `${heading}\n${trimmed}` : trimmed,
      });
    }
  };

  for (const line of normalised.split('\n')) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line);

    if (match) {
      flush();
      const depth = match[1]!.length;
      stack.length = Math.max(0, depth - 1);
      stack[depth - 1] = match[2]!.trim().replace(/[*_`]/g, '');
      continue;
    }

    buffer.push(line);
  }

  flush();
  return chunks;
}
