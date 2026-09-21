'use server';

/**
 * "Check Status" on the Fonepay QR, and the page's own check every few seconds
 * while the QR is on screen.
 *
 * The same server-side confirmation the callback page runs — ask the gateway,
 * settle if it says so — answering only whether there is an outcome to show
 * yet. Nothing the browser sends is believed: it names a session, and the
 * session's own attempt is looked up and polled.
 */
import { isPaymentError } from '@softmato/payment-core';

import { confirmSessionPayment } from '@/lib/checkout/confirm';

export async function checkPayment(
  sessionId: string,
): Promise<'pending' | 'paid' | 'done' | 'unreachable'> {
  try {
    const outcome = await confirmSessionPayment(sessionId);

    if (outcome.state === 'pending') return 'pending';

    // Any other outcome is the callback page's to show; `paid` lets the QR say so first.
    return outcome.state === 'settled' ? 'paid' : 'done';
  } catch (error) {
    // Fonepay down or slow. The attempt is untouched; the customer can retry.
    if (isPaymentError(error)) return 'unreachable';

    throw error;
  }
}
