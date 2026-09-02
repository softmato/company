import 'server-only';

import { getSettings } from '@/lib/settings/queries';

import { sellerFromSettings } from './seller';
import type { Party } from './types';

/**
 * Softmato's own details, read from `platform_settings`.
 *
 * One line of its own module because it is the only `server-only` part of
 * knowing who the seller is, and keeping it apart is what lets `seller.ts`
 * stay pure — see the note there. The founder can change the registered
 * address in the admin panel without a deploy; an address baked into a
 * template is one that goes stale silently.
 */
export async function sellerParty(): Promise<Party> {
  return sellerFromSettings(await getSettings());
}
