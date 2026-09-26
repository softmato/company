import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { NewClientForm } from '@/components/admin/clients/new-client-form';
import { Card, CardBody } from '@/components/ui/card';

export const metadata: Metadata = { title: 'New client' };

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Breadcrumbs trail={[{ label: 'Clients', href: '/admin/clients' }]}>
        New client
      </Breadcrumbs>

      <div>
        <h1 className="headline text-[30px] leading-tight">New client</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates the client, the customer record their invoices are issued to,
          and a portal account for one contact. You get a link to send them.
        </p>
      </div>

      <Card>
        <CardBody className="py-5">
          <NewClientForm />
        </CardBody>
      </Card>
    </div>
  );
}
