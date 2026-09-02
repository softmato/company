/**
 * Products — the ledger dimension.
 *
 * A product is what per-product P&L is sliced by (docs/CHART_OF_ACCOUNTS.md
 * §8). An application is a credential that may call `/api/v1` on a product's
 * behalf, and those live at `/admin/applications`.
 *
 * They used to be registered from this page. They are not any more: minting,
 * rotating and revoking a credential now share a screen with the domain
 * allowlist that decides where that credential may send a customer, and
 * splitting those across two places is how one of them gets edited and the
 * other forgotten. This page counts them and links out.
 */
import Link from 'next/link';

import { listProductsWithApplicationCounts } from '@/lib/applications/queries';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await listProductsWithApplicationCounts();

  return (
    <div className="max-w-3xl">
      <Breadcrumbs trail={[]}>Products</Breadcrumbs>

      <h1 className="headline mt-2 text-2xl">Products</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Every product line the ledger can be sliced by. Credentials are managed
        on{' '}
        <Link
          href="/admin/applications"
          className="underline underline-offset-4"
        >
          Applications
        </Link>
        .
      </p>

      <ul className="mt-8 space-y-3">
        {products.map((product) => (
          <li key={product.id} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">
                {product.name}{' '}
                <span className="font-mono text-xs text-muted-foreground">
                  {product.id}
                </span>
              </h2>

              <span className="eyebrow">
                {product.kind}
                {product.isActive ? '' : ' · inactive'}
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {product.applicationCount === 0
                ? 'No applications registered.'
                : `${product.applicationCount} application${
                    product.applicationCount === 1 ? '' : 's'
                  }, ${product.liveApplicationCount} live.`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
