import type { Metadata } from 'next';

import { getPage, listPublishedServices } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { CardList } from '@/components/public/card-list';
import { CmsPage } from '@/components/public/cms-page';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('services');
  return page ? metadataFor(page) : { title: 'Services' };
}

export default async function ServicesIndexPage() {
  const services = await listPublishedServices();

  return (
    <CmsPage slug="services">
      <CardList
        empty="Services appear here once they are published."
        items={services.map((service) => ({
          key: String(service.id),
          href: `/services/${service.slug}`,
          title: service.title,
          description: service.summary,
        }))}
      />
    </CmsPage>
  );
}
