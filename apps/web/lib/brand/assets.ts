/**
 * The brand assets, named once.
 *
 * Three masters live in `public/brand/`, and every derived size is generated
 * from them by `scripts/build-brand-assets.mts` rather than exported by hand.
 * That is the whole point of this file: a favicon, an apple touch icon, two
 * manifest icons and the invoice stamp are all the same two drawings at
 * different sizes, and keeping six hand-cut PNGs in sync is how a site ends up
 * with last year's logo in the browser tab.
 *
 * Not `server-only`: the stamp is rendered by the invoice surface and the logo
 * by the public header, so these paths have to be readable from both sides.
 */

/**
 * The horizontal lockup — emblem, "Softmato" wordmark, TECHNOLOGY arc.
 *
 * This is the one a search engine is shown as the organisation's logo, and the
 * one that belongs anywhere the company is being identified to someone who
 * does not already know it. Do not use it below about 160px wide; the arc text
 * closes up and the emblem's counters fill in.
 */
export const BRAND_LOGO = '/brand/logo.png';

/**
 * The standalone S mark.
 *
 * Everything square comes from here: the favicon, the touch icon, the manifest
 * icons. The lockup cannot do this job — at 32px the wordmark is three grey
 * pixels and the arc is one.
 */
export const BRAND_MARK = '/brand/mark.png';

/**
 * The digital stamp — "SOFTMATO TECHNOLOGY PVT LTD · KATHMANDU, NEPAL".
 *
 * For receipts and invoices only. It reads as a seal of issue, so putting it
 * on a marketing page would be claiming a document is official when it is an
 * advertisement. Kept here so the invoice work has it ready.
 */
export const BRAND_STAMP = '/brand/stamp.png';

/** Manifest and touch-icon sizes, generated from {@link BRAND_MARK}. */
export const BRAND_MARK_192 = '/brand/mark-192.png';
export const BRAND_MARK_512 = '/brand/mark-512.png';
