import { describe, expect, it } from 'vitest';

import { generateSessionId, isSessionIdShape } from '../sessions/id';

describe('session ids', () => {
  it('matches the database check constraint', () => {
    // Same pattern as `session_id_format` in packages/db/schema/payments.ts.
    const constraint = /^cs_(live|test)_[A-Za-z0-9_-]{32,}$/;

    for (let i = 0; i < 200; i++) {
      expect(generateSessionId(i % 2 === 0)).toMatch(constraint);
    }
  });

  it('carries the mode of the application, not of the server', () => {
    expect(generateSessionId(true).startsWith('cs_live_')).toBe(true);
    expect(generateSessionId(false).startsWith('cs_test_')).toBe(true);
  });

  it('carries at least 32 bytes of entropy', () => {
    // base64url of 32 bytes is 43 characters with no padding.
    const suffix = generateSessionId(true).slice('cs_live_'.length);
    expect(suffix.length).toBe(43);
  });

  it('does not repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateSessionId(true));
    expect(seen.size).toBe(1000);
  });

  it('rejects junk before it reaches a query', () => {
    expect(isSessionIdShape('cs_live_short')).toBe(false);
    expect(isSessionIdShape("cs_live_'; DROP TABLE payment_sessions--")).toBe(
      false,
    );
    expect(isSessionIdShape(generateSessionId(false))).toBe(true);
  });
});
