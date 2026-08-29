import { AppStill } from './app-still';
import { ProductStill } from './product-still';
import { WebsiteStill } from './website-still';

export { AppStill, ProductStill, WebsiteStill };

/**
 * Which drawing the services chapter holds up beside each service.
 *
 * **Keyed by slug, not by index.** This was an index cycle — `STILLS[i % n]` —
 * on the argument that a founder can rename, reorder, unpublish or add services
 * and every one should still get *a* panel. That is true, and it is also how a
 * service ends up beside a picture of something else: the moment
 * `payment-integration` came off the site the remaining two shifted up and the
 * apps service was illustrated with a website. A wrong picture is worse than no
 * picture on the one section of this page whose job is to show rather than tell.
 *
 * So: a named slug gets its own drawing, and anything unrecognised falls back to
 * `ProductStill` — the most general of the three — rather than to nothing. A new
 * service renders correctly on the day it is published and gets its own drawing
 * when someone makes one.
 *
 * `payment-integration` has no entry. It is a draft again (see
 * `packages/db/seed/marketing/services.ts`); if it is published again it wants a
 * checkout drawing back, which is in git history at `checkout-still.tsx`.
 */
const BY_SLUG = {
  'product-engineering': ProductStill,
  'web-applications': WebsiteStill,
  'mobile-apps': AppStill,
} as const;

export function stillFor(slug: string) {
  return BY_SLUG[slug as keyof typeof BY_SLUG] ?? ProductStill;
}
