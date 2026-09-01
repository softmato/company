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

const CMS_IMAGE_KEY = new RegExp(
  `^${CMS_IMAGE_PREFIX}/` +
    /* uuid */ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' +
    /* slug */ '-[a-z0-9-]{1,60}' +
    /* ext  */ '\\.([a-z0-9]{2,4})$',
);

/**
 * Recognises a key this module produced, and hands back its extension.
 *
 * The confirm half of a presigned upload is told which key to go and look at,
 * and that key arrives from the browser. Reading, and especially *deleting*,
 * whatever an argument names is not something to do on trust — so a key is
 * only acted on if it has the exact shape `cmsImageKey` emits. Anything
 * else — another prefix, a traversal, a bare object name — returns null and
 * the caller refuses.
 *
 * The extension comes back because it is the server's own record of the type
 * it agreed to sign, which the confirm step checks the real bytes against.
 */
export function parseCmsImageKey(key: string): { extension: string } | null {
  const match = CMS_IMAGE_KEY.exec(key);
  if (!match) return null;

  return { extension: match[1]! };
}
