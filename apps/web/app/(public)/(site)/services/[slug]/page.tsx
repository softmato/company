import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  getService,
  listPublishedServices,
  publishedSlugs,
} from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { serviceNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { ScopeBand } from '@/components/public/services/scope-band';
import { ServiceGrid } from '@/components/public/services/service-grid';
import { ServiceHero } from '@/components/public/services/service-hero';
import { ServiceSections } from '@/components/public/services/service-sections';

export async function generateStaticParams() {
  const slugs = await publishedSlugs('services');
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/services/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);

  return service
    ? metadataFor(service, { path: `/services/${slug}` })
    : { title: 'Not found' };
}

export default async function ServicePage({
  params,
}: PageProps<'/services/[slug]'>) {
  const { slug } = await params;
  const [service, all] = await Promise.all([
    getService(slug),
    listPublishedServices(),
  ]);

  if (!service) notFound();

  const others = all.filter((other) => other.slug !== slug).slice(0, 3);

  return (
    <article>
      <JsonLd
        id="breadcrumbs"
        data={breadcrumbList([
          { name: 'Services', path: '/services' },
          { name: service.title },
        ])}
      />
      <JsonLd id="service" data={serviceNode(service)} />

      <ServiceHero
        slug={slug}
        title={service.title}
        summary={service.summary}
      />
      <ServiceSections body={service.body} />
      <ScopeBand />

      {others.length ? (
        <section aria-labelledby="other-services" className="mt-20">
          <h2 id="other-services" className="headline mb-6 text-[22px]">
            Other services
          </h2>
          <ServiceGrid services={others} compact />
        </section>
      ) : null}
    </article>
  );
}
