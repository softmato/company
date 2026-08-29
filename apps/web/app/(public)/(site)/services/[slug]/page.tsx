import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getService, publishedSlugs } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { serviceNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { Markdown } from '@/components/public/markdown';
import { PageHeader } from '@/components/public/page-header';

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
  const service = await getService(slug);

  if (!service) notFound();

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

      <PageHeader
        eyebrow="Service"
        title={service.title}
        lead={service.summary}
      />
      <Markdown>{service.body}</Markdown>
    </article>
  );
}
