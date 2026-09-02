import { describe, it, expect } from 'vitest';
import { retrieveContext } from '../lib/ai/retrieve-context';
import { chunkMarkdown } from '../lib/ai/knowledge/chunk';
import {
  loadChunks,
  getIndex,
  KNOWLEDGE_FILES,
} from '../lib/ai/knowledge/load';
import {
  rankChunks,
  selectWithinBudget,
  buildIndex,
} from '../lib/ai/knowledge/search';
import { expandQuery, tokenize } from '../lib/ai/knowledge/tokenize';

describe('Markdown chunking', () => {
  const sample = `# Guide

Intro line.

## Pricing

### Static Tier
Best for marketing sites.

### Custom Tier
Best for multi-tenant SaaS platforms.
`;

  it('splits at headings and carries the heading trail into the text', () => {
    const chunks = chunkMarkdown('guide.md', sample);
    const custom = chunks.find((c) => c.heading.includes('Custom Tier'));

    expect(custom).toBeDefined();
    expect(custom!.heading).toBe('Guide > Pricing > Custom Tier');
    // The trail is in the text, so the chunk is self-describing in the prompt.
    expect(custom!.text).toContain('Pricing');
    expect(custom!.text).toContain('multi-tenant SaaS');
  });

  it('does not leak one section body into another', () => {
    const chunks = chunkMarkdown('guide.md', sample);
    const staticTier = chunks.find((c) => c.heading.includes('Static Tier'));

    expect(staticTier!.body).toContain('marketing sites');
    expect(staticTier!.body).not.toContain('multi-tenant');
  });

  it('keeps every chunk small enough to be worth retrieving', () => {
    for (const chunk of loadChunks()) {
      expect(chunk.text.length).toBeLessThan(1_200);
    }
  });

  it('chunks a CRLF file exactly like an LF one', () => {
    /*
     * A carriage return is a line terminator to JS regex, so `.*$` in the
     * heading pattern never reaches the end of a CRLF line and not one
     * heading matches — the whole document silently becomes a single
     * unusable blob. Two knowledge files saved from a Windows editor hit
     * this for real.
     */
    const lf = chunkMarkdown('guide.md', sample);
    const crlf = chunkMarkdown('guide.md', sample.replace(/\n/g, '\r\n'));

    expect(crlf.length).toBe(lf.length);
    expect(crlf.map((c) => c.heading)).toEqual(lf.map((c) => c.heading));
    expect(crlf.every((c) => !c.text.includes('\r'))).toBe(true);
  });

  it('finds headings even in a file with no trailing newline', () => {
    const chunks = chunkMarkdown('x.md', '# Title\nBody text here.');
    expect(chunks[0]!.heading).toBe('Title');
  });
});

describe('Query expansion', () => {
  it('stems singular and plural to the same term', () => {
    // The invariant is that the forms agree, not that they agree on any
    // particular string — the stem itself is an implementation detail.
    expect(tokenize('services')).toEqual(tokenize('service'));
    expect(tokenize('pricing')).toEqual(tokenize('price'));
    expect(tokenize('confidentiality')).toEqual(tokenize('confidential'));
  });

  it('drops stopwords but keeps question words that carry meaning', () => {
    expect(tokenize('what is the cost')).toEqual(['cost']);
  });

  it('bridges a visitor word to the vocabulary the docs use', () => {
    const { expanded } = expandQuery('how much do you charge');
    // Expansions come back stemmed, like everything else the index holds.
    expect(expanded).toEqual(expect.arrayContaining(tokenize('price')));
  });
});

describe('Chunk ranking', () => {
  it('returns the section that answers the question, not the top of the file', () => {
    /*
     * The regression this whole layer exists for. The old retriever matched
     * pricing.md then sliced its first 650 characters — the title and
     * preamble — so the tier that answers a mobile/app pricing question was
     * never in the prompt.
     */
    const ranked = rankChunks(
      'how much does a custom saas platform cost',
      getIndex(),
    );
    expect(ranked.length).toBeGreaterThan(0);

    // The guarantee is that the tier describing SaaS platforms is retrieved,
    // not that it outranks everything — the FAQ entry on how quotes work is a
    // fair answer to the same question and contains "cost" literally.
    const top3 = ranked.slice(0, 3).map((r) => r.chunk);
    const tier = top3.find(
      (c) => c.filename === 'pricing.md' && /tier/i.test(c.heading),
    );

    expect(tier).toBeDefined();
    // And it is a tier section, never the preamble the old slice(0, 650)
    // returned for every pricing question.
    expect(tier!.body.toLowerCase()).toContain('saas');
  });

  it('finds policy content for a question phrased without policy words', () => {
    const ranked = rankChunks('is my idea kept confidential', getIndex());
    expect(ranked[0]!.chunk.filename).toBe('policies.md');
  });

  it('scores nothing for a query with no overlap', () => {
    expect(rankChunks('zxqw unrelated gibberish', getIndex())).toHaveLength(0);
  });
});

describe('Context budget', () => {
  it('never exceeds the character budget', () => {
    const index = getIndex();
    const ranked = rankChunks(
      'pricing services mobile app security team',
      index,
    );
    const selected = selectWithinBudget(ranked, {
      maxChars: 800,
      maxChunks: 10,
      maxPerFile: 5,
    });

    const total = selected.reduce((n, s) => n + s.chunk.text.length, 0);
    expect(total).toBeLessThanOrEqual(800);
  });

  it('caps how much any one file can contribute', () => {
    const index = getIndex();
    const ranked = rankChunks(
      'service services web mobile app development',
      index,
    );
    const selected = selectWithinBudget(ranked, {
      maxChars: 99_999,
      maxChunks: 20,
      maxPerFile: 2,
    });

    const perFile = new Map<string, number>();
    for (const { chunk } of selected) {
      perFile.set(chunk.filename, (perFile.get(chunk.filename) ?? 0) + 1);
    }
    for (const count of perFile.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it('handles an empty index without throwing', () => {
    const empty = buildIndex([]);
    expect(rankChunks('anything', empty)).toEqual([]);
  });
});

describe('retrieveContext', () => {
  it('keeps a greeting cheap — identity only', async () => {
    const ctx = await retrieveContext('hey');
    expect(ctx).toHaveLength(1);
    expect(ctx[0]!.filename).toBe('company.md');
    expect(ctx[0]!.content.length).toBeLessThanOrEqual(600);
  });

  it('sends a bounded payload, not whole documents', async () => {
    const ctx = await retrieveContext(
      'tell me about your pricing and services and security',
    );
    const total = ctx.reduce((n, c) => n + c.content.length, 0);

    expect(ctx.length).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(2_000);
  });

  it('always returns something to ground an answer on', async () => {
    const ctx = await retrieveContext('zxqw unrelated gibberish');
    expect(ctx.length).toBeGreaterThan(0);
  });

  it('reads every knowledge file that ships', () => {
    const seen = new Set(loadChunks().map((c) => c.filename));
    for (const filename of KNOWLEDGE_FILES) {
      expect(seen.has(filename)).toBe(true);
    }
  });
});
