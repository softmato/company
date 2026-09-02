/**
 * Registering an application: one form, one act.
 *
 * The domain list is captured here rather than on a second screen, so an
 * application cannot exist for even a moment without its allowlist. A
 * credential that is briefly allowed to send customers anywhere is a
 * credential that will be used in exactly that window.
 */
import { APPLICATION_SCOPES } from '@softmato/db';

import { listProductOptions } from '@/lib/applications/queries';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { RegisterApplicationForm } from '@/components/admin/register-application-form';

export const dynamic = 'force-dynamic';

export default async function NewApplicationPage() {
  const products = await listProductOptions();

  return (
    <div className="max-w-2xl">
      <Breadcrumbs trail={[{ label: 'Applications', href: '/admin/applications' }]}>
        Register
      </Breadcrumbs>

      <h1 className="headline mt-2 text-2xl">Register an application</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Two secrets are generated and shown once, on the next screen. They are
        different credentials and neither works in the other&rsquo;s place.
      </p>

      <RegisterApplicationForm
        products={products}
        scopes={APPLICATION_SCOPES}
      />
    </div>
  );
}
