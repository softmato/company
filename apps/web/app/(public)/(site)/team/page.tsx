import type { Metadata } from 'next';

import { getPage, listPublishedTeam } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { teamPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { CmsPage } from '@/components/public/cms-page';
import { TeamGrid } from '@/components/public/team-grid';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('team');
  return page ? metadataFor(page, { path: '/team' }) : { title: 'Team' };
}

export default async function TeamPage() {
  const [members, page] = await Promise.all([
    listPublishedTeam(),
    getPage('team'),
  ]);

  return (
    <>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Team' }])} />
      <JsonLd
        id="page"
        data={teamPageNode({
          name: page?.metaTitle ?? page?.title ?? 'Team',
          description: page?.metaDescription,
          members,
        })}
      />
      <CmsPage slug="team">
        <TeamGrid members={members} />
      </CmsPage>
    </>
  );
}
