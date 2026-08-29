/**
 * The photograph in the "where we are" section.
 *
 * A real picture of the city, from Unsplash, standing in until the company has
 * photographs of its own. `images.unsplash.com` is already the one non-bucket
 * host `next/image` is allowed to optimise from — see
 * `lib/images/trusted-hosts.ts` — so this needs no config change and no
 * download.
 *
 * **It is a placeholder and it is labelled as one.** A stock photograph of an
 * office with people in it would read as a picture of this company's office and
 * this company's staff, which is a claim, and claims about the business wait
 * for the founder. A picture of Kathmandu is a picture of Kathmandu.
 *
 * Replace `src` with an R2 URL when the real photograph exists; nothing else
 * here changes.
 */
export const PLACE_PHOTO = {
  src: 'https://images.unsplash.com/photo-1650817421446-5f7af03031c2?w=1200&q=72',
  alt: 'Rooftops across the Kathmandu valley',
  credit: 'Kathmandu · placeholder photograph',
  width: 1200,
  height: 1500,
} as const;

/** The one figure on this page that can be checked against something. */
export const PLACE_COORDINATES = {
  latitude: '27.7172° N',
  longitude: '85.3240° E',
  label: 'Kathmandu, Nepal',
} as const;
