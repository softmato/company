import type { Metadata } from 'next';

import { getPage, listPublishedProducts } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { collectionPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { CardList } from '@/components/public/card-list';
import { CmsPage } from '@/components/public/cms-page';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('products');
  return page
    ? metadataFor(page, { path: '/products' })
    : { title: 'Products' };
}

export default async function ProductsIndexPage() {
  const [products, page] = await Promise.all([
    listPublishedProducts(),
    getPage('products'),
  ]);

  return (
    <>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Products' }])} />
      <JsonLd
        id="page"
        data={collectionPageNode({
          path: '/products',
          name: page?.metaTitle ?? page?.title ?? 'Products',
          description: page?.metaDescription,
          items: products.map((product) => ({
            name: product.title,
            path: `/products/${product.slug}`,
          })),
        })}
      />

      <CmsPage slug="products">
        <CardList
          columns={2}
          empty="Products appear here once their pages are published."
          items={products.map((product) => ({
            key: String(product.id),
            href: `/products/${product.slug}`,
            title: product.title,
            description: product.tagline,
          }))}
        />
      </CmsPage>
    </>
  );
}
