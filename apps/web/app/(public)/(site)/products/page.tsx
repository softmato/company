import type { Metadata } from 'next';

import { getPage, listPublishedProducts } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { CardList } from '@/components/public/card-list';
import { CmsPage } from '@/components/public/cms-page';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('products');
  return page ? metadataFor(page) : { title: 'Products' };
}

export default async function ProductsIndexPage() {
  const products = await listPublishedProducts();

  return (
    <CmsPage slug="products">
      <CardList
        empty="Products appear here once their pages are published."
        items={products.map((product) => ({
          key: String(product.id),
          href: `/products/${product.slug}`,
          title: product.title,
          description: product.tagline,
        }))}
      />
    </CmsPage>
  );
}
