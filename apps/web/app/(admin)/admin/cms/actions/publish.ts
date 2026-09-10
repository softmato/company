'use server';

import { eq } from 'drizzle-orm';
import { db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { contentKind, getContent, tableFor } from '@/lib/cms';
import { rowSlug } from '@/lib/cms/public-paths';

import { revalidateContent } from './revalidate';
import { parseId, requireAdmin, requireKind } from './shared';

/**
 * Publishing stamps the date the database requires rather than asking the
 * founder for one. The constraint exists so a published row always has a
 * usable date; making a human supply it is how you end up with the constraint
 * firing in their face.
 */
export async function publishContent(form: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const kindSlug = requireKind(form.get('kind'));
  const id = parseId(form.get('id'));
  const kind = contentKind(kindSlug);
  const table = tableFor(kindSlug);

  const before = await getContent(kindSlug, id);
  if (!before) return;

  const now = new Date();
  const patch: Record<string, unknown> = {
    status: 'published',
    updatedBy: Number(adminId),
    updatedAt: now,
  };

  // Records when it FIRST went live, so it must not move on a re-publish.
  if (!before.publishedAt) patch.publishedAt = now;

  if (kind.publishRequires === 'effectiveAt' && !before.effectiveAt) {
    patch.effectiveAt = now;
  }

  await db.update(table).set(patch).where(eq(table.id, id));

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'cms.publish',
    resourceType: kindSlug,
    resourceId: String(id),
    beforeState: before,
    afterState: await getContent(kindSlug, id),
  });

  revalidateContent(kindSlug, [rowSlug(before)]);
}

/** Takes content off the public site without deleting it. */
export async function unpublishContent(form: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const kindSlug = requireKind(form.get('kind'));
  const id = parseId(form.get('id'));
  const table = tableFor(kindSlug);

  const before = await getContent(kindSlug, id);
  if (!before) return;

  await db
    .update(table)
    .set({ status: 'draft', updatedBy: Number(adminId), updatedAt: new Date() })
    .where(eq(table.id, id));

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'cms.unpublish',
    resourceType: kindSlug,
    resourceId: String(id),
    beforeState: before,
    afterState: await getContent(kindSlug, id),
  });

  revalidateContent(kindSlug, [rowSlug(before)]);
}
