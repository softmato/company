import type { Metadata } from 'next';

import { getPage } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { CmsPage } from '@/components/public/cms-page';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('careers');
  return page ? metadataFor(page) : { title: 'Careers' };
}

export default function CareersPage() {
  return <CmsPage slug="careers" />;
}
