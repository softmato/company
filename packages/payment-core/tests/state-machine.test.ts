import { describe, expect, it } from 'vitest';

import { PaymentError } from '../errors';
import {
  assertTransition as assertSession,
  canTransition as canSession,
  isPayable,
  type SessionStatus,
} from '../sessions/state-machine';
import {
  assertTransition as assertTxn,
  canTransition as canTxn,
  isSettled,
  isTerminal,
  type TxnStatus,
} from '../transactions/state-machine';

describe('transaction state machine', () => {
  it('allows the confirmation path', () => {
    expect(canTxn('created', 'pending')).toBe(true);
    expect(canTxn('pending', 'succeeded')).toBe(true);
  });

  // The rule this whole module exists for: a succeeded payment never becomes
  // unsucceeded, because that is how one payment gets credited twice.
  it.each<TxnStatus>(['created', 'pending', 'failed', 'cancelled', 'expired'])(
    'refuses succeeded → %s',
    (to) => {
      expect(canTxn('succeeded', to)).toBe(false);
    },
  );

  it.each<TxnStatus>(['failed', 'cancelled', 'expired', 'reversed'])(
    '%s is terminal',
    (status) => {
      expect(isTerminal(status)).toBe(true);
    },
  );

  it('lets a mismatch be raised from anywhere money was expected', () => {
    expect(canTxn('created', 'reconciliation_required')).toBe(true);
    expect(canTxn('pending', 'reconciliation_required')).toBe(true);
    expect(canTxn('succeeded', 'reconciliation_required')).toBe(true);
  });

  it('lets a human resolve a mismatch in either direction', () => {
    expect(canTxn('reconciliation_required', 'succeeded')).toBe(true);
    expect(canTxn('reconciliation_required', 'failed')).toBe(true);
  });

  it('treats refunded states as settled, so a journal is still required', () => {
    expect(isSettled('succeeded')).toBe(true);
    expect(isSettled('partially_refunded')).toBe(true);
    expect(isSettled('refunded')).toBe(true);
    expect(isSettled('pending')).toBe(false);
  });

  it('throws a typed error rather than returning false', () => {
    try {
      assertTxn('succeeded', 'pending', { txnId: 7 });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PaymentError);
      expect((err as PaymentError).code).toBe('ILLEGAL_TRANSITION');
      expect((err as PaymentError).context).toMatchObject({
        from: 'succeeded',
        to: 'pending',
        txnId: 7,
      });
    }
  });
});

describe('session state machine', () => {
  it('lets a customer change payment method before paying', () => {
    expect(canSession('provider_selected', 'provider_selected')).toBe(true);
    expect(canSession('failed', 'provider_selected')).toBe(true);
  });

  it('never reopens a paid session', () => {
    const everything: SessionStatus[] = [
      'created',
      'provider_selected',
      'pending',
      'succeeded',
      'failed',
      'cancelled',
      'expired',
    ];

    for (const to of everything) {
      expect(canSession('succeeded', to)).toBe(false);
    }
  });

  it('reports which statuses may still take a payment', () => {
    expect(isPayable('created')).toBe(true);
    expect(isPayable('pending')).toBe(true);
    expect(isPayable('failed')).toBe(true);
    expect(isPayable('expired')).toBe(false);
    expect(isPayable('succeeded')).toBe(false);
  });

  it('throws on an illegal move', () => {
    expect(() => assertSession('expired', 'succeeded')).toThrow(PaymentError);
  });
});
