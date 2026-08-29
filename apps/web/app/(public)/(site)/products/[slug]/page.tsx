import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProductPage, publishedSlugs } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { productNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { CmsImageFill } from '@/components/public/cms-image';
import { Markdown } from '@/components/public/markdown';
import { PageHeader } from '@/components/public/page-header';

export async function generateStaticParams() {
  const slugs = await publishedSlugs('products');
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductPage(slug);

  return product
    ? metadataFor(product, { path: `/products/${slug}` })
    : { title: 'Not found' };
}

export default async function ProductPage({
  params,
}: PageProps<'/products/[slug]'>) {
  const { slug } = await params;
  const product = await getProductPage(slug);

  if (!product) notFound();

  return (
    <article>
      <JsonLd
        id="breadcrumbs"
        data={breadcrumbList([
          { name: 'Products', path: '/products' },
          { name: product.title },
        ])}
      />
      <JsonLd id="product" data={productNode(product)} />

      <PageHeader
        eyebrow="Product"
        title={product.title}
        lead={product.tagline}
      />

      {product.siteUrl ? (
        <p className="mt-4">
          <a
            href={product.siteUrl}
            className="text-primary underline underline-offset-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            Visit {product.title}
          </a>
        </p>
      ) : null}

      <Markdown>{product.body}</Markdown>

      {product.screenshotUrl ? (
        /*
         * Contained, not cropped: a screenshot with its edges cut off is a
         * screenshot of nothing in particular. The frame reserves the space;
         * a screenshot that is not 16:9 sits letterboxed inside it.
         */
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg border border-border bg-muted">
          <CmsImageFill
            src={product.screenshotUrl}
            alt={`${product.title} screenshot`}
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-contain"
          />
        </div>
      ) : null}
    </article>
  );
}
