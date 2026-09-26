import { describe, expect, test } from 'vitest';

import { relativeDue } from '@/lib/projects/dates';
import { hashToken, isTokenShape, newToken } from '@/lib/portal/token';

describe('portal tokens', () => {
  test('a new token has the accepted shape and a stable hash', () => {
    const token = newToken();
    expect(isTokenShape(token)).toBe(true);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
  });

  test('anything else is refused before it reaches a query', () => {
    expect(isTokenShape('')).toBe(false);
    expect(isTokenShape('../../etc/passwd')).toBe(false);
    expect(isTokenShape(`${newToken()}x`)).toBe(false);
  });
});

describe('relativeDue', () => {
  const now = new Date('2026-09-26T06:00:00Z'); // midday in Kathmandu

  test('counts whole Kathmandu days', () => {
    expect(relativeDue('2026-09-26', now)).toBe('today');
    expect(relativeDue('2026-09-27', now)).toBe('tomorrow');
    expect(relativeDue('2026-10-01', now)).toBe('in 5 days');
    expect(relativeDue('2026-09-24', now)).toBe('2 days late');
  });
});
