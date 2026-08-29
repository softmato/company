import type { Metadata } from 'next';

import { getPage, listPublishedServices } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { collectionPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { CardList } from '@/components/public/card-list';
import { CmsPage } from '@/components/public/cms-page';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('services');
  return page
    ? metadataFor(page, { path: '/services' })
    : { title: 'Services' };
}

export default async function ServicesIndexPage() {
  const [services, page] = await Promise.all([
    listPublishedServices(),
    getPage('services'),
  ]);

  return (
    <>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Services' }])} />
      <JsonLd
        id="page"
        data={collectionPageNode({
          path: '/services',
          name: page?.metaTitle ?? page?.title ?? 'Services',
          description: page?.metaDescription,
          items: services.map((service) => ({
            name: service.title,
            path: `/services/${service.slug}`,
          })),
        })}
      />

      <CmsPage slug="services">
        <CardList
          columns={2}
          empty="Services appear here once they are published."
          items={services.map((service) => ({
            key: String(service.id),
            href: `/services/${service.slug}`,
            title: service.title,
            description: service.summary,
          }))}
        />
      </CmsPage>
    </>
  );
}
