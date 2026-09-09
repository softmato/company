/**
 * The real brand mark for each payment provider.
 *
 * These replace three hand-drawn SVG approximations that used to live in
 * `components/checkout/provider-icons.tsx` — a red square with an `F`, a green
 * pin with an `e`, a purple `K`. They were recognisable at a glance and wrong
 * on inspection, which is the worst combination for the one control on a
 * checkout page: a customer deciding where their money goes should see the
 * mark they see in the app they are about to open.
 *
 * Keyed by `ProviderId`, so adding a provider to `payment-core` without adding
 * its mark here is a type error rather than a blank space in the picker.
 */
import type { ProviderId } from '@softmato/payment-core';

import type { MarkAsset } from './mark-asset';

export const WALLET_MARKS: Record<ProviderId, MarkAsset> = {
  // A wordmark, not an emblem: twice as wide as it is tall. See `MarkAsset.ratio`.
  fonepay: { src: '/wallets/fonepay.png', label: 'Fonepay', ratio: 2 },
  esewa: { src: '/wallets/esewa.png', label: 'eSewa' },
  khalti: { src: '/wallets/khalti.png', label: 'Khalti' },
};

/**
 * The mark for a provider id, or `null` when there is none.
 *
 * Takes a `string` rather than a `ProviderId` because most callers are reading
 * a column: `payments.provider_id` is `text`, and a row written before a
 * provider was renamed is a real possibility. An unknown id draws nothing,
 * which leaves the caller's own label doing the work — better than a broken
 * image beside a correct name.
 */
export function walletMark(id: string): MarkAsset | null {
  return WALLET_MARKS[id as ProviderId] ?? null;
}
