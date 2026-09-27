import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Boxes } from 'lucide-react';

import { getPage, listPublishedProducts } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { splitLede } from '@/lib/markdown/lede';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { collectionPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { Markdown } from '@/components/public/markdown';
import { PageIntro } from '@/components/public/page-intro';
import { ProductList } from '@/components/public/products/product-list';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('products');
  return page
    ? metadataFor(page, { path: '/products' })
    : { title: 'Products' };
}

/**
 * `/products` — the `products` CMS page's lede over every published product,
 * closing on the rest of that page's body. An unpublished page 404s, as
 * `CmsPage` does.
 */
export default async function ProductsIndexPage() {
  const [products, page] = await Promise.all([
    listPublishedProducts(),
    getPage('products'),
  ]);

  if (!page) notFound();

  const { lede, rest } = splitLede(page.body);

  return (
    <article>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Products' }])} />
      <JsonLd
        id="page"
        data={collectionPageNode({
          path: '/products',
          name: page.metaTitle ?? page.title,
          description: page.metaDescription,
          items: products.map((product) => ({
            name: product.title,
            path: `/products/${product.slug}`,
          })),
        })}
      />

      <PageIntro
        icon={Boxes}
        eyebrow="What we run"
        title={page.title}
        lead={lede}
      />

      <section aria-labelledby="all-products" className="mt-20">
        <h2 id="all-products" className="sr-only">
          All products
        </h2>
        <ProductList products={products} />
      </section>

      {rest ? (
        <div className="mx-auto mt-16 max-w-[60ch] text-center text-muted-foreground">
          <Markdown>{rest}</Markdown>
        </div>
      ) : null}
    </article>
  );
}
