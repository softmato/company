/**
 * Phase 8 acceptance 1 and 2, against a real database: a client sees only
 * their own projects, and an id belonging to someone else finds nothing.
 *
 * Two clients are built the way the admin panel builds them, each with a
 * project, a deliverable, a file record and a message. Every portal read is
 * then asked, as client A, for client B's things.
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

import {
  clientUsers,
  clients,
  customers,
  db,
  projectDeliverables,
  projectDocuments,
  projectMessages,
  projects,
} from '@softmato/db';

import { createClient } from '@/lib/clients/create';
import { clientInvoices } from '@/lib/portal/invoices';
import {
  clientDeliverable,
  clientDocument,
  clientDocuments,
  clientOwnsProject,
  clientProject,
  clientProjects,
  recentClientMessages,
} from '@/lib/portal/queries';

interface Fixture {
  clientId: number;
  userId: number;
  customerId: number;
  projectId: number;
  deliverableId: number;
  documentId: number;
}

const run = Math.random().toString(36).slice(2, 10);
let a: Fixture;
let b: Fixture;

async function build(label: string): Promise<Fixture> {
  const { clientId, userId } = await createClient({
    name: `Isolation ${label} ${run}`,
    contactName: `Person ${label}`,
    contactEmail: `isolation-${label}-${run}@example.com`,
  });
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId));

  const [project] = await db
    .insert(projects)
    .values({ clientId, name: `Project ${label}` })
    .returning({ id: projects.id });
  const projectId = project!.id;

  const [deliverable] = await db
    .insert(projectDeliverables)
    .values({ projectId, title: `Deliverable ${label}`, status: 'in_review' })
    .returning({ id: projectDeliverables.id });

  const [document] = await db
    .insert(projectDocuments)
    .values({
      projectId,
      objectKey: `projects/${projectId}/isolation-${run}-${label}.pdf`,
      fileName: `${label}.pdf`,
      contentType: 'application/pdf',
      sizeBytes: 10,
      uploadedBy: 'client',
      clientUserId: userId,
    })
    .returning({ id: projectDocuments.id });

  await db.insert(projectMessages).values({
    projectId,
    author: 'client',
    clientUserId: userId,
    body: `Secret of ${label}`,
  });

  return {
    clientId,
    userId,
    customerId: client!.customerId,
    projectId,
    deliverableId: deliverable!.id,
    documentId: document!.id,
  };
}

beforeAll(async () => {
  a = await build('a');
  b = await build('b');
}, 60_000);

afterAll(async () => {
  const fixtures = [a, b].filter(Boolean);
  const projectIds = fixtures.map((f) => f.projectId);
  const clientIds = fixtures.map((f) => f.clientId);

  // Children go with the project (ON DELETE CASCADE).
  if (projectIds.length)
    await db.delete(projects).where(inArray(projects.id, projectIds));
  if (clientIds.length) {
    await db
      .delete(clientUsers)
      .where(inArray(clientUsers.clientId, clientIds));
    await db.delete(clients).where(inArray(clients.id, clientIds));
    await db.delete(customers).where(
      inArray(
        customers.id,
        fixtures.map((f) => f.customerId),
      ),
    );
  }
}, 60_000);

describe('a client reads only its own records', () => {
  test('the project list holds only their projects', async () => {
    const ids = (await clientProjects(a.clientId)).map((p) => p.id);
    expect(ids).toContain(a.projectId);
    expect(ids).not.toContain(b.projectId);
  });

  test("another client's project id finds nothing", async () => {
    expect(await clientProject(a.clientId, a.projectId)).not.toBeNull();
    expect(await clientProject(a.clientId, b.projectId)).toBeNull();
    expect(await clientOwnsProject(a.clientId, b.projectId)).toBe(false);
  });

  test("another client's file and deliverable ids find nothing", async () => {
    expect(await clientDocument(a.clientId, a.documentId)).not.toBeNull();
    expect(await clientDocument(a.clientId, b.documentId)).toBeNull();
    expect(await clientDeliverable(a.clientId, b.deliverableId)).toBeNull();
  });

  test('cross-project lists never mix clients', async () => {
    const files = (await clientDocuments(a.clientId)).map((d) => d.id);
    expect(files).toEqual([a.documentId]);

    const messages = await recentClientMessages(a.clientId, 50);
    expect(messages.map((m) => m.body)).toEqual(['Secret of a']);
  });

  test('a new client has no invoices', async () => {
    expect(await clientInvoices(a.customerId)).toEqual([]);
  });
});

describe('the database refuses inconsistent portal rows', () => {
  test('a message must name the author its side claims', async () => {
    await expect(
      db.insert(projectMessages).values({
        projectId: a.projectId,
        author: 'admin',
        clientUserId: a.userId,
        body: 'impersonating Softmato',
      }),
    ).rejects.toThrow();
  });

  test('a stored file cannot exceed 5 MB', async () => {
    await expect(
      db.insert(projectDocuments).values({
        projectId: a.projectId,
        objectKey: `projects/${a.projectId}/too-big-${run}.pdf`,
        fileName: 'big.pdf',
        contentType: 'application/pdf',
        sizeBytes: 5 * 1024 * 1024 + 1,
        uploadedBy: 'client',
        clientUserId: a.userId,
      }),
    ).rejects.toThrow();
  });

  test('an email is stored lowercase or not at all', async () => {
    await expect(
      db.insert(clientUsers).values({
        clientId: a.clientId,
        name: 'X',
        email: `Mixed-${run}@Example.com`,
      }),
    ).rejects.toThrow();
  });
});
