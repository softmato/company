import 'server-only';
import { revalidatePath } from 'next/cache';

import { publicPathsFor } from '@/lib/cms/public-paths';
import type { ContentKindSlug } from '@/lib/cms/registry';

/**
 * Purges everything a content change invalidates: the admin list the founder
 * is looking at, and the public routes the rows are rendered into.
 *
 * Every action that writes a content row calls this. Saving, publishing and
 * unpublishing all change what the site should serve — unpublishing most of
 * all, since a missed purge there keeps withdrawn content on the internet.
 *
 * The public paths are the load-bearing half and were missing until 2026-09-10;
 * see lib/cms/public-paths.ts for why a prerendered page needs telling.
 */
export function revalidateContent(
  kind: ContentKindSlug,
  slugs: readonly (string | undefined)[] = [],
): void {
  revalidatePath(`/admin/cms/${kind}`);

  for (const path of publicPathsFor(kind, slugs)) {
    /*
     * `'page'` is required for a route pattern and pointless for anything
     * else. Without it Next reads `/blog/[slug]` as a literal path — it warns
     * and purges nothing, which is a silent no-op rather than a failure.
     */
    revalidatePath(path, path.includes('[') ? 'page' : undefined);
  }
}
