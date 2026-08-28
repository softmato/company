/**
 * The customer choosing how to pay.
 *
 * `allowed_providers` was computed from the amount when the session was created
 * (docs/API.md §8) and is checked again here against the stored array — not
 * recomputed, and not re-read from the providers table. The list the customer
 * was shown is the list they are held to; a provider deactivated or re-limited
 * mid-session must not change what a checkout page in front of a human is
 * offering, and the only way to guarantee that is to compare against what was
 * written down.
 *
 * Re-selection is legal. A customer who opens Khalti, thinks better of it and
 * comes back to manual QR is doing something normal, and the session follows
 * them — the state machine allows `provider_selected → provider_selected` for
 * exactly this. Each attempt gets its own transaction row; this function does
 * not create one.
 */
import type { DbLike, PaymentSession } from '@softmato/db';

import { PaymentError } from '../errors';
import { isProviderId, type ProviderId } from '../providers/types';
import { loadPayableSession } from './load';
import { transitionSession } from './transition';

export async function selectProvider(
  tx: DbLike,
  sessionId: string,
  providerId: string,
  now = new Date(),
): Promise<PaymentSession> {
  if (!isProviderId(providerId)) {
    throw new PaymentError('VALIDATION_FAILED', 'Unknown provider', {
      sessionId,
      providerId,
    });
  }

  // Loads, settles expiry, and refuses a session that can no longer be paid.
  const session = await loadPayableSession(tx, sessionId, now);

  assertOffered(session, providerId);

  // Already on this provider and nothing else has happened — nothing to write.
  // Returning early keeps a double-click from being an illegal transition when
  // the session has since moved to `pending`.
  if (
    session.selectedProvider === providerId &&
    session.status === 'provider_selected'
  ) {
    return session;
  }

  return transitionSession(tx, session, 'provider_selected', {
    selectedProvider: providerId,
  });
}

/**
 * A provider outside the offered list is not a validation error the customer
 * made — the checkout page only renders what the session allows, so reaching
 * here means a hand-built request. It is refused the same way regardless.
 */
function assertOffered(session: PaymentSession, providerId: ProviderId): void {
  if (!session.allowedProviders.includes(providerId)) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      'That provider was not offered for this session',
      {
        sessionId: session.id,
        providerId,
        allowed: session.allowedProviders,
      },
    );
  }
}
