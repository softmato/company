/**
 * A provider's status word → the subset we are prepared to believe.
 *
 * The adapters all used to end this mapping with `|| 'pending'`, which reads
 * as a harmless default and is not one. `pending` means "ask again later", so
 * an unrecognised status becomes a transaction that polls forever, and the
 * things it silently swallows are exactly the ones worth knowing about:
 * eSewa's `NOT_FOUND` and `AMBIGUOUS`, Khalti's `Partially refunded`. Each of
 * those is a real condition with a real response, and none of them is
 * "probably still going".
 *
 * An unmapped status is therefore an error. It fails one payment loudly
 * instead of mistranslating every future one, and the fix is a line in the
 * map — written deliberately, by someone who checked what the word means.
 */
import { PaymentError } from '../errors';
import type { ProviderId, VerifiedStatus } from './types';

export type StatusMap = Readonly<Record<string, VerifiedStatus>>;

export function mapProviderStatus(
  providerId: ProviderId,
  map: StatusMap,
  raw: unknown,
): VerifiedStatus {
  const key = typeof raw === 'string' ? raw.trim() : '';
  const mapped = key ? map[key] : undefined;

  if (!mapped) {
    throw new PaymentError(
      'PROVIDER_UNAVAILABLE',
      `${providerId} returned an unrecognised status: ${JSON.stringify(raw)}`,
      { providerId, status: String(raw), known: Object.keys(map) },
    );
  }

  return mapped;
}
