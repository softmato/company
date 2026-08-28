/**
 * Hosts `next/image` is allowed to optimise from, besides our own bucket.
 *
 * Shared by `next.config.ts` (which turns these into `remotePatterns`) and
 * `CmsImage` (which decides per-image whether to optimise or fall back to a
 * plain `<img>`). One list, because the two disagreeing is exactly the bug
 * that produces a runtime image error on a page that built fine: the config
 * decides what the optimiser accepts, the component decides what it sends.
 *
 * Never widen this to a wildcard. An optimiser that accepts any host is an
 * open image proxy anyone can point at anything.
 */
export const TRUSTED_IMAGE_HOSTNAMES = ['images.unsplash.com'] as const;
