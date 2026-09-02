import { describe, it, expect } from 'vitest';
import { retrieveContext } from '../lib/ai/retrieve-context';

/**
 * A readable record of what real questions actually retrieve.
 *
 * Asserted on the *answer*, not the filename. Both the FAQ and the policy
 * document legitimately answer "who owns the code" — pinning a case to one
 * file would fail the moment a better-phrased entry is added elsewhere, which
 * is a knowledge-base improvement rather than a regression. What must never
 * break is that the fact itself reaches the prompt.
 */
const CASES: Array<{ query: string; answer: RegExp }> = [
  { query: 'how much does a mobile app cost?', answer: /tier|quote|proposal/i },
  {
    query: 'do you sign an NDA before we share our idea?',
    answer: /nda|confidential/i,
  },
  { query: 'who founded softmato?', answer: /jiwan|siddhant/i },
  {
    query: 'what payment gateways do you support in nepal?',
    answer: /esewa|khalti|fonepay/i,
  },
  {
    query: 'do you build iOS and android apps?',
    answer: /ios|android|mobile/i,
  },
  {
    query: 'who owns the code when the project finishes?',
    answer: /copyright|intellectual property/i,
  },
  {
    query: 'when can we have a call this week?',
    answer: /weekday|10:00|11:30|14:00|slot/i,
  },
  { query: 'is the discovery call free?', answer: /free|no charge/i },
];

describe('Retrieval behaviour on real questions', () => {
  for (const { query, answer } of CASES) {
    it(`"${query}" retrieves the fact that answers it`, async () => {
      const contexts = await retrieveContext(query);
      const combined = contexts.map((c) => c.content).join('\n');

      expect(combined).toMatch(answer);
    });
  }

  it('every question stays inside the prompt budget', async () => {
    for (const { query } of CASES) {
      const contexts = await retrieveContext(query);
      const total = contexts.reduce((n, c) => n + c.content.length, 0);

      expect(total).toBeLessThanOrEqual(2_000);
      expect(contexts.length).toBeLessThanOrEqual(4);
    }
  });

  it('never leaks an internal filename into retrieved text', async () => {
    // The persona forbids mentioning backend detail; a knowledge file that
    // says "see policies.md" invites the model to say it too.
    for (const { query } of CASES) {
      const contexts = await retrieveContext(query);
      for (const context of contexts) {
        expect(context.content).not.toMatch(/\b[a-z-]+\.md\b/);
      }
    }
  });
});
