import { describe, expect, it } from 'vitest';

import { PaymentError } from '../errors';
import { FonepayProviderAdapter } from '../providers/fonepay';

/**
 * Fonepay is not implemented, and these tests exist to keep it that way until
 * the bank's integration document arrives (PHASES.md Phase 9: *"Do not guess
 * at Fonepay request shapes. Ask."*).
 *
 * What they guard against is the specific failure the previous adapter had.
 * Its `poll()` opened with `if (!secretKey || prn.startsWith('FP_') ||
 * isSandbox)` and returned `succeeded` for the exact expected amount — and
 * because `initiate()` minted every PRN with an `FP_` prefix, that branch was
 * unconditional. Every Fonepay payment reported success, passed the amount
 * check, and would have posted a journal entry crediting revenue for money
 * nobody sent.
 *
 * A guess that returns a plausible value is worse than no implementation,
 * because it reads as finished. Refusing is the honest answer.
 */
describe('FonepayProviderAdapter', () => {
  const adapter = new FonepayProviderAdapter();

  it('refuses to initiate', async () => {
    await expect(adapter.initiate({} as never)).rejects.toThrow(PaymentError);
  });

  it('refuses to poll, rather than reporting a success nobody paid for', async () => {
    await expect(adapter.poll({} as never)).rejects.toThrow(PaymentError);
  });

  it('exposes no callback or refund path', () => {
    const surface = adapter as { handleCallback?: unknown; refund?: unknown };

    expect(surface.handleCallback).toBeUndefined();
    expect(surface.refund).toBeUndefined();
  });

  it('says why it refuses, and points at the phase that fixes it', async () => {
    await expect(adapter.poll({} as never)).rejects.toThrow(/Phase 9/);
  });

  it('still reports its provider id, so the registry shape holds', () => {
    expect(adapter.id).toBe('fonepay');
  });
});
