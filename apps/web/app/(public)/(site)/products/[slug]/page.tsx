import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

import { getProductPage, publishedSlugs } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { productNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { BlurIn } from '@/components/motion/blur-in';
import { Drift } from '@/components/motion/drift';
import { CmsImageFill } from '@/components/public/cms-image';
import {
  ProductIcon,
  siteHost,
} from '@/components/public/products/product-icon';
import { ServiceSections } from '@/components/public/services/service-sections';

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

      <header className="flex flex-col items-center text-center">
        <Drift distance={6} duration={3.5}>
          <ProductIcon
            src={product.logoUrl}
            name={product.title}
            className="size-24 sm:size-28"
          />
        </Drift>

        <BlurIn
          as="h1"
          className="headline mt-8 text-[clamp(2.4rem,6vw,3.75rem)] leading-[1.05]"
        >
          {product.title}
        </BlurIn>

        {product.siteUrl ? (
          <a
            href={product.siteUrl}
            className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            rel="noopener noreferrer"
            target="_blank"
          >
            Visit {siteHost(product.siteUrl)}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        ) : null}

        {product.tagline ? (
          <p className="mt-6 max-w-[56ch] text-[16.5px] leading-relaxed text-muted-foreground">
            {product.tagline}
          </p>
        ) : null}
      </header>

      <ServiceSections body={product.body} />

      {product.screenshotUrl ? (
        /*
         * Contained, not cropped: a screenshot with its edges cut off is a
         * screenshot of nothing in particular. The frame reserves the space;
         * a screenshot that is not 16:9 sits letterboxed inside it.
         */
        <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-3xl border border-border bg-muted">
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
