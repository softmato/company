import type { Metadata } from 'next';

import { getPage } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { webPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { CmsPage } from '@/components/public/cms-page';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('careers');
  return page ? metadataFor(page, { path: '/careers' }) : { title: 'Careers' };
}

export default async function CareersPage() {
  const page = await getPage('careers');

  return (
    <>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Careers' }])} />
      <JsonLd
        id="page"
        data={webPageNode({
          path: '/careers',
          name: page?.metaTitle ?? page?.title ?? 'Careers',
          description: page?.metaDescription,
        })}
      />
      <CmsPage slug="careers" />
    </>
  );
}
