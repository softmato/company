import type { Metadata } from 'next';

import { getPage, listPublishedTeam } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { CmsPage } from '@/components/public/cms-page';
import { TeamGrid } from '@/components/public/team-grid';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('team');
  return page ? metadataFor(page) : { title: 'Team' };
}

export default async function TeamPage() {
  const members = await listPublishedTeam();

  return (
    <CmsPage slug="team">
      <TeamGrid members={members} />
    </CmsPage>
  );
}
