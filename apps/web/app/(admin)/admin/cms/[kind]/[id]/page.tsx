/** Editor for one piece of content. Composition only — see the components. */
import { notFound } from 'next/navigation';

import { contentKind, getContent, isContentKind } from '@/lib/cms';
import { r2Configured } from '@/lib/env';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ContentForm } from '@/components/admin/content-form';
import { PublicationPanel } from '@/components/admin/publication-panel';
import { StatusBadge } from '@/components/admin/status-badge';

export const dynamic = 'force-dynamic';

export default async function ContentEditPage({
  params,
}: PageProps<'/admin/cms/[kind]/[id]'>) {
  const { kind: kindSlug, id } = await params;

  if (!isContentKind(kindSlug)) notFound();

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const kind = contentKind(kindSlug);
  const row = await getContent(kindSlug, numericId);

  if (!row) notFound();

  const title = String(row.title ?? row.name ?? kind.singular);

  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        trail={[
          { label: 'Content', href: '/admin/cms' },
          { label: kind.label, href: `/admin/cms/${kind.slug}` },
        ]}
      >
        Edit
      </Breadcrumbs>

      <div className="mt-2 flex items-center gap-3">
        <h1 className="headline text-[30px] leading-tight">{title}</h1>
        <StatusBadge status={row.status} />
      </div>

      <ContentForm
        kindSlug={kind.slug}
        fields={kind.fields}
        row={row}
        uploadEnabled={r2Configured}
      />

      <PublicationPanel
        kindSlug={kind.slug}
        id={row.id}
        title={title}
        published={row.status === 'published'}
      />
    </div>
  );
}
