/**
 * Products and the SaaS applications registered against them
 * (docs/FOLDER_STRUCTURE.md — "products/ SaaS registration, credentials").
 *
 * A product is the ledger dimension; an application is a credential that may
 * call `/api/v1` on that product's behalf. One product can have several — a
 * live one and a sandbox one at minimum.
 */
import { APPLICATION_SCOPES } from '@softmato/db';

import { listProductsWithApplications } from '@/lib/applications/queries';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ApplicationPanel } from '@/components/admin/application-panel';
import { RegisterApplicationForm } from '@/components/admin/register-application-form';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await listProductsWithApplications();

  return (
    <div className="max-w-3xl">
      <Breadcrumbs trail={[]}>Products</Breadcrumbs>

      <h1 className="headline mt-2 text-2xl">Products &amp; applications</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Each SaaS product calls the payment API with its own credential, scoped
        to what it actually needs. A secret is shown once, at issue. There is no
        way to read it again — a lost secret is rotated, not recovered.
      </p>

      <div className="mt-8 space-y-10">
        {products.map((product) => (
          <section key={product.id}>
            <header className="flex items-baseline justify-between border-b border-border pb-2">
              <h2 className="text-lg font-medium">
                {product.name}{' '}
                <span className="font-mono text-xs text-muted-foreground">
                  {product.id}
                </span>
              </h2>
              <span className="eyebrow">
                {product.kind}
                {product.isActive ? '' : ' · inactive'}
              </span>
            </header>

            {product.applications.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No applications registered.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {product.applications.map((application) => (
                  <li key={application.id}>
                    <ApplicationPanel
                      application={application}
                      scopes={APPLICATION_SCOPES}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-medium">Register an application</h2>
        <RegisterApplicationForm
          products={products.map(({ id, name }) => ({ id, name }))}
          scopes={APPLICATION_SCOPES}
        />
      </section>
    </div>
  );
}
