import { describe, expect, it } from 'vitest';

import { PaymentError } from '../errors';
import { mapProviderStatus, type StatusMap } from '../providers/status';

const MAP: StatusMap = {
  COMPLETE: 'succeeded',
  PENDING: 'pending',
};

describe('mapProviderStatus', () => {
  it('maps what it knows', () => {
    expect(mapProviderStatus('esewa', MAP, 'COMPLETE')).toBe('succeeded');
    expect(mapProviderStatus('esewa', MAP, '  PENDING  ')).toBe('pending');
  });

  /**
   * The adapters all ended this mapping with `|| 'pending'`. That default
   * reads as harmless and is not: `pending` means "ask again later", so an
   * unrecognised status became a transaction that polls forever. What it
   * silently swallowed were the statuses most worth acting on — eSewa's
   * `NOT_FOUND` and `AMBIGUOUS`, Khalti's `Partially Refunded`.
   */
  it('throws on a status it does not recognise, rather than guessing pending', () => {
    for (const unknown of ['AMBIGUOUS', 'NOT_FOUND', 'Partially Refunded']) {
      expect(() => mapProviderStatus('esewa', MAP, unknown)).toThrow(
        PaymentError,
      );
    }
  });

  it('throws on an absent or non-string status', () => {
    for (const bad of [undefined, null, '', 42, {}]) {
      expect(() => mapProviderStatus('esewa', MAP, bad)).toThrow(PaymentError);
    }
  });

  it('names the statuses it knows, so the fix is obvious from the log', () => {
    try {
      mapProviderStatus('esewa', MAP, 'AMBIGUOUS');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as PaymentError).context?.known).toEqual([
        'COMPLETE',
        'PENDING',
      ]);
    }
  });
});
