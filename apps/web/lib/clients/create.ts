/**
 * Creating an agency client: the company, its `customers` row, and its first
 * person — together or not at all.
 *
 * The customer row is what the client's invoices are issued to (product
 * `agency`), so the portal finds "their invoices" by foreign key.
 *
 * No `server-only` marker: `scripts/portal-demo.mts` shares this, so a demo
 * client is built exactly the way the admin panel builds a real one.
 */
import { clientUsers, clients, customers, db, type DbTx } from '@softmato/db';

export interface NewClientInput {
  name: string;
  contactName: string;
  contactEmail: string;
}

export async function createClient(
  input: NewClientInput,
): Promise<{ clientId: number; userId: number }> {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({
        productId: 'agency',
        name: input.name,
        email: input.contactEmail.toLowerCase(),
      })
      .returning({ id: customers.id });

    const [client] = await tx
      .insert(clients)
      .values({ name: input.name, customerId: customer!.id })
      .returning({ id: clients.id });

    const userId = await addClientPerson(tx, client!.id, {
      name: input.contactName,
      email: input.contactEmail,
    });

    return { clientId: client!.id, userId };
  });
}

export async function addClientPerson(
  tx: DbTx,
  clientId: number,
  person: { name: string; email: string },
): Promise<number> {
  const [user] = await tx
    .insert(clientUsers)
    .values({
      clientId,
      name: person.name,
      email: person.email.toLowerCase(),
    })
    .returning({ id: clientUsers.id });

  return user!.id;
}

/** A unique-violation on `client_users.email` — the one expected failure. */
export function isDuplicateEmail(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.message} ${String((error as { cause?: unknown }).cause ?? '')}`
      : String(error);
  return text.includes('client_users_email_unique');
}
