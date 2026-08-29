import type { Metadata } from 'next';

import { getPage } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { webPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { CmsPage } from '@/components/public/cms-page';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('about');
  return page ? metadataFor(page, { path: '/about' }) : { title: 'About' };
}

export default async function AboutPage() {
  const page = await getPage('about');

  return (
    <>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'About' }])} />
      <JsonLd
        id="page"
        data={webPageNode({
          path: '/about',
          name: page?.metaTitle ?? page?.title ?? 'About',
          description: page?.metaDescription,
        })}
      />
      <CmsPage slug="about" />
    </>
  );
}
