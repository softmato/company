import { describe, expect, it } from 'vitest';

import { generateClientId } from '../applications/credentials';
import {
  explainProductId,
  normalizeProductId,
} from '../applications/product-slug';

/**
 * A product id is permanent in a way most identifiers are not: it is minted
 * into every client id the product ever issues, and a client id cannot be
 * changed without orphaning the credential that carries it.
 */
describe('normalizeProductId', () => {
  it('accepts what a product is actually called', () => {
    expect(normalizeProductId('questioncall')).toBe('questioncall');
    expect(normalizeProductId('question-call')).toBe('question-call');
    expect(normalizeProductId('hostel2')).toBe('hostel2');
  });

  it('corrects case and surrounding space, which are typing accidents', () => {
    expect(normalizeProductId('  QuestionCall  ')).toBe('questioncall');
  });

  /**
   * Refused rather than repaired. Turning `Question Call` into `question-call`
   * would invent an identifier the admin never chose and then make it
   * permanent.
   */
  it('refuses anything it would have to invent a shape for', () => {
    expect(normalizeProductId('Question Call')).toBeNull();
    expect(normalizeProductId('question.call')).toBeNull();
    expect(normalizeProductId('-questioncall')).toBeNull();
    expect(normalizeProductId('questioncall-')).toBeNull();
    expect(normalizeProductId('question--call')).toBeNull();
    expect(normalizeProductId('')).toBeNull();
    expect(normalizeProductId('q')).toBeNull();
  });

  /**
   * The underscore is the separator inside a client id, so an id containing
   * one produces `app_live_question_call_7fk2m9qz` — a string nobody can split
   * back apart by eye.
   */
  it('refuses the underscore specifically', () => {
    expect(normalizeProductId('question_call')).toBeNull();
    expect(explainProductId('question_call')).toMatch(/underscore/i);
  });

  it('refuses the sentinel the register form submits for a new product', () => {
    expect(normalizeProductId('__new__')).toBeNull();
  });

  /** Every seeded id predates this rule and must still satisfy it. */
  it('accepts every product the seed creates', () => {
    for (const id of ['hostelhub', 'questioncall', 'agency', 'corporate']) {
      expect(normalizeProductId(id)).toBe(id);
    }
  });
});

describe('explainProductId', () => {
  it('says nothing about an id it accepts', () => {
    expect(explainProductId('questioncall')).toBeNull();
  });

  it('gives a different sentence for each way of being wrong', () => {
    expect(explainProductId('')).toMatch(/give the product an id/i);
    expect(explainProductId('q')).toMatch(/characters/i);
    expect(explainProductId('Question Call')).toMatch(/lowercase/i);
  });
});

/**
 * The reason all of the above is strict: the id ends up here, and this string
 * goes out to an integrator and into every log line.
 */
describe('the client id it produces', () => {
  it('keeps the four underscore-separated parts readable', () => {
    const clientId = generateClientId('question-call', 'live');

    expect(clientId).toMatch(
      /^app_live_question-call_[0-9bcdfghjkmnpqrstvwxyz]{8}$/,
    );
    expect(clientId.split('_')).toHaveLength(4);
  });
});
