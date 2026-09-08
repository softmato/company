import 'server-only';

import { cookies } from 'next/headers';
import type { CredentialMode } from '@softmato/db';

/**
 * Which population the admin section is currently describing.
 *
 * Held in a cookie rather than a query parameter because it is not a property
 * of one page. Sandbox and Production are two different sets of books, and a
 * person reading them has to be reading one of them everywhere at once — the
 * dashboard saying Production while /admin/payments lists Sandbox rows is how
 * a test payment gets mistaken for revenue.
 *
 * A query parameter cannot do that: it survives a link that carries it and
 * nothing else, so every nav item would have to remember to pass it and one
 * that forgot would silently switch modes mid-session.
 */
export const ADMIN_MODE_COOKIE = 'softmato_admin_mode';

/**
 * Production unless the cookie explicitly says Sandbox.
 *
 * Anything unrecognised — absent, stale, hand-edited — is Production. The
 * default is the safe direction: showing real money to someone who expected
 * test data is a surprise, and showing test data to someone who expected real
 * money is a wrong number they may act on.
 */
export async function adminMode(): Promise<CredentialMode> {
  const store = await cookies();

  return store.get(ADMIN_MODE_COOKIE)?.value === 'test' ? 'test' : 'live';
}
