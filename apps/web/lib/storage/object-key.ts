/**
 * R2 object keys (docs/ENVIRONMENT.md §3).
 *
 * Both buckets are laid out `{owner}/{category}/…`. Today the only owner is
 * the company itself; a SaaS product added later takes its own prefix in the
 * same two buckets rather than a bucket of its own, so the split that actually
 * matters — public versus private — stays a property of the bucket and never
 * of a path someone can mistype.
 *
 * No `server-only` import: this is pure string work and the tests exercise it
 * directly.
 */

/** The prefix every key the platform itself writes begins with. */
export const OWNER = 'company';

/** Public bucket. CMS images, team photos, blog covers. */
export const CMS_IMAGE_PREFIX = `${OWNER}/images`;

/**
 * Reduces any caller-supplied name to `[a-z0-9-]`.
 *
 * This is the only thing standing between a filename and the key layout: a
 * slash or a `..` surviving here would let an upload land somewhere it was
 * never meant to.
 */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

/**
 * `company/images/{uuid}-{slug}.{ext}` in the public bucket.
 *
 * The uuid is what makes the key unguessable and collision-free; the slug is
 * only there so a human reading a bucket listing can tell what a file is.
 */
export function cmsImageKey(
  name: string,
  extension: string,
  uuid: string,
): string {
  return `${CMS_IMAGE_PREFIX}/${uuid}-${slugify(name)}.${extension}`;
}
