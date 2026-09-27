import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { getPage, listPublishedServices } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { splitLede } from '@/lib/markdown/lede';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { collectionPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { PageIntro } from '@/components/public/page-intro';
import { ScopeBand } from '@/components/public/services/scope-band';
import { ServiceGrid } from '@/components/public/services/service-grid';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('services');
  return page
    ? metadataFor(page, { path: '/services' })
    : { title: 'Services' };
}

/**
 * `/services` — the `services` CMS page's lede over every published service
 * as a tile, closing on how work is scoped. An unpublished page 404s, as
 * `CmsPage` does.
 */
export default async function ServicesIndexPage() {
  const [services, page] = await Promise.all([
    listPublishedServices(),
    getPage('services'),
  ]);

  if (!page) notFound();

  const { lede, rest } = splitLede(page.body);

  return (
    <article>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Services' }])} />
      <JsonLd
        id="page"
        data={collectionPageNode({
          path: '/services',
          name: page.metaTitle ?? page.title,
          description: page.metaDescription,
          items: services.map((service) => ({
            name: service.title,
            path: `/services/${service.slug}`,
          })),
        })}
      />

      <PageIntro
        icon={Sparkles}
        eyebrow="What we build"
        title={page.title}
        lead={lede}
      />

      <section aria-labelledby="all-services" className="mt-14">
        <h2 id="all-services" className="sr-only">
          All services
        </h2>
        <ServiceGrid services={services} />
      </section>

      <ScopeBand text={rest} />
    </article>
  );
}
