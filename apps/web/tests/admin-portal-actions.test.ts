/**
 * The admin's client and project actions, run against the real database.
 *
 * The admin screens sit behind password + TOTP, so nothing but this exercises
 * their writes end to end. The session guard is replaced with a real admin's
 * id; everything under it — validation, SQL, constraints, audit rows — is the
 * code that ships. Mail and cache revalidation are stubbed: neither exists
 * outside a request, and mail must never leave a test run.
 */
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { and, asc, eq } from 'drizzle-orm';

import {
  adminUsers,
  clientSessions,
  clientUsers,
  clients,
  customers,
  db,
  projectDeliverables,
  projectMessages,
  projectMilestones,
  projectStages,
  projects,
} from '@softmato/db';

let adminId = '';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/admin/require-admin', () => ({
  requireAdmin: async () => adminId,
  parseId: (raw: unknown) => Number(raw),
}));
vi.mock('@/lib/portal/notify', () => ({
  emailInvite: async () => ({ sent: false, reason: 'stubbed in tests' }),
  notifyClientOfMessage: () => {},
  notifyCompanyOfMessage: () => {},
  notifyReviewRequested: () => {},
}));

const { createClientAction } =
  await import('@/app/(admin)/admin/clients/actions/create-client');
const { createProjectAction } =
  await import('@/app/(admin)/admin/clients/actions/create-project');
const { setPersonActiveAction } =
  await import('@/app/(admin)/admin/clients/actions/set-person-active');
const { reissueInviteAction } =
  await import('@/app/(admin)/admin/clients/actions/reissue-invite');
const { setClientArchivedAction } =
  await import('@/app/(admin)/admin/clients/actions/set-client-archived');
const { updateProjectAction } =
  await import('@/app/(admin)/admin/projects/actions/update-project');
const { addStageAction } =
  await import('@/app/(admin)/admin/projects/actions/add-stage');
const { moveStageAction } =
  await import('@/app/(admin)/admin/projects/actions/move-stage');
const { updateStageAction } =
  await import('@/app/(admin)/admin/projects/actions/update-stage');
const { deleteStageAction } =
  await import('@/app/(admin)/admin/projects/actions/delete-stage');
const { addMilestoneAction } =
  await import('@/app/(admin)/admin/projects/actions/add-milestone');
const { toggleMilestoneAction } =
  await import('@/app/(admin)/admin/projects/actions/toggle-milestone');
const { addDeliverableAction } =
  await import('@/app/(admin)/admin/projects/actions/add-deliverable');
const { updateDeliverableAction } =
  await import('@/app/(admin)/admin/projects/actions/update-deliverable');
const { postAdminMessageAction } =
  await import('@/app/(admin)/admin/projects/actions/post-message');
const { adminProject, clientDetail, listClients } =
  await import('@/lib/clients/queries');

const run = Math.random().toString(36).slice(2, 10);
const form = (fields: Record<string, string | number>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, String(v));
  return data;
};

let clientId = 0;
let userId = 0;
let projectId = 0;

/*
 * A throwaway admin, inactive so the TOTP constraint does not apply. It only
 * has to exist for the foreign keys on messages; a fresh CI database has none.
 */
beforeAll(async () => {
  const [admin] = await db
    .insert(adminUsers)
    .values({
      email: `actions-admin-${run}@example.com`,
      name: 'Test Admin',
      passwordHash: 'x',
      isActive: false,
    })
    .returning({ id: adminUsers.id });
  adminId = String(admin!.id);
});

afterAll(async () => {
  if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
  if (clientId) {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    await db.delete(clientUsers).where(eq(clientUsers.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    if (client)
      await db.delete(customers).where(eq(customers.id, client.customerId));
  }
  if (adminId)
    await db.delete(adminUsers).where(eq(adminUsers.id, Number(adminId)));
}, 60_000);

describe('clients', () => {
  test('creating a client makes the customer, the person and a link', async () => {
    const state = await createClientAction(
      {},
      form({
        name: `Actions ${run}`,
        contactName: 'Mina Rai',
        contactEmail: `Actions-${run}@Example.com`,
        emailInvite: 'on',
      }),
    );

    expect(state.error).toBeUndefined();
    expect(state.invite?.url).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);
    expect(state.invite?.emailError).toBe('stubbed in tests');
    clientId = state.clientId!;

    const [person] = await db
      .select()
      .from(clientUsers)
      .where(eq(clientUsers.clientId, clientId));
    expect(person?.email).toBe(`actions-${run}@example.com`);
    userId = person!.id;
  });

  test('the same email twice is refused in words, not a 500', async () => {
    const state = await createClientAction(
      {},
      form({
        name: `Actions dup ${run}`,
        contactName: 'Mina',
        contactEmail: `actions-${run}@example.com`,
      }),
    );
    expect(state.error).toMatch(/already has a portal account/);
    // The whole client rolled back with it, customer included.
    const dupes = await db
      .select()
      .from(clients)
      .where(eq(clients.name, `Actions dup ${run}`));
    expect(dupes).toHaveLength(0);
  });

  test('turning access off ends sessions and refuses a new link', async () => {
    await db.insert(clientSessions).values({
      id: `test-${run}`,
      clientUserId: userId,
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    expect(
      (await setPersonActiveAction({}, form({ userId, active: 'false' })))
        .error,
    ).toBeUndefined();
    expect(
      await db
        .select()
        .from(clientSessions)
        .where(eq(clientSessions.clientUserId, userId)),
    ).toHaveLength(0);
    expect((await reissueInviteAction({}, form({ userId }))).error).toMatch(
      /Reactivate/,
    );

    await setPersonActiveAction({}, form({ userId, active: 'true' }));
    expect(
      (await reissueInviteAction({}, form({ userId, send: 'show' }))).invite
        ?.url,
    ).toBeTruthy();
  });

  test('archiving and restoring', async () => {
    await setClientArchivedAction({}, form({ clientId, archive: 'true' }));
    expect((await clientDetail(clientId))?.client.archivedAt).not.toBeNull();
    await setClientArchivedAction({}, form({ clientId, archive: 'false' }));
    expect((await clientDetail(clientId))?.client.archivedAt).toBeNull();
  });
});

describe('projects', () => {
  test('a new project starts with the usual five stages', async () => {
    try {
      await createProjectAction(
        {},
        form({
          clientId,
          name: `Site ${run}`,
          standardStages: 'on',
          startsOn: '2026-09-01',
        }),
      );
      throw new Error('expected a redirect');
    } catch (error) {
      const digest = String((error as { digest?: string }).digest ?? '');
      const match = /\/admin\/projects\/(\d+)/.exec(digest);
      expect(match, `not a redirect: ${String(error)}`).not.toBeNull();
      projectId = Number(match![1]);
    }

    const stages = await db
      .select()
      .from(projectStages)
      .where(eq(projectStages.projectId, projectId))
      .orderBy(asc(projectStages.position));
    expect(stages.map((s) => s.name)).toEqual([
      'Discovery',
      'Design',
      'Build',
      'Testing',
      'Launch',
    ]);
  });

  test('a due date before the start is refused by the database, with a sentence', async () => {
    const state = await updateProjectAction(
      {},
      form({
        projectId,
        name: `Site ${run}`,
        status: 'active',
        startsOn: '2026-09-10',
        dueOn: '2026-09-01',
      }),
    );
    expect(state.error).toBe(
      'The due date must be on or after the start date.',
    );
  });

  test('stages: add at the end, move, complete, remove', async () => {
    expect(
      (await addStageAction({}, form({ projectId, name: 'Support' }))).error,
    ).toBeUndefined();

    const order = async () =>
      (
        await db
          .select()
          .from(projectStages)
          .where(eq(projectStages.projectId, projectId))
          .orderBy(asc(projectStages.position), asc(projectStages.id))
      ).map((s) => s.name);
    expect(await order()).toEqual([
      'Discovery',
      'Design',
      'Build',
      'Testing',
      'Launch',
      'Support',
    ]);

    const [support] = await db
      .select()
      .from(projectStages)
      .where(
        and(
          eq(projectStages.projectId, projectId),
          eq(projectStages.name, 'Support'),
        ),
      );
    await moveStageAction({}, form({ stageId: support!.id, direction: 'up' }));
    expect(await order()).toEqual([
      'Discovery',
      'Design',
      'Build',
      'Testing',
      'Support',
      'Launch',
    ]);

    const [discovery] = await db
      .select()
      .from(projectStages)
      .where(eq(projectStages.projectId, projectId))
      .orderBy(asc(projectStages.position))
      .limit(1);
    await updateStageAction(
      {},
      form({
        stageId: discovery!.id,
        name: 'Discovery',
        description: '',
        status: 'done',
      }),
    );
    const [done] = await db
      .select()
      .from(projectStages)
      .where(eq(projectStages.id, discovery!.id));
    expect(done?.status).toBe('done');
    expect(done?.completedAt).not.toBeNull();

    await deleteStageAction({}, form({ stageId: support!.id }));
    expect(await order()).not.toContain('Support');
  });

  test('milestones and deliverables', async () => {
    await addMilestoneAction(
      {},
      form({ projectId, title: 'Go live', dueOn: '2026-12-01' }),
    );
    const [m] = await db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId));
    await toggleMilestoneAction(
      {},
      form({ milestoneId: m!.id, reached: 'true' }),
    );
    expect(
      (
        await db
          .select()
          .from(projectMilestones)
          .where(eq(projectMilestones.id, m!.id))
      )[0]?.completedAt,
    ).not.toBeNull();

    expect(
      (
        await addDeliverableAction(
          {},
          form({ projectId, title: 'Design', linkUrl: 'javascript:alert(1)' }),
        )
      ).error,
    ).toMatch(/https/);
    await addDeliverableAction(
      {},
      form({
        projectId,
        title: 'Design',
        linkUrl: 'https://figma.example/x',
        forReview: 'on',
      }),
    );
    const [d] = await db
      .select()
      .from(projectDeliverables)
      .where(eq(projectDeliverables.projectId, projectId));
    expect(d?.status).toBe('in_review');

    await updateDeliverableAction(
      {},
      form({
        deliverableId: d!.id,
        title: 'Design v2',
        description: '',
        linkUrl: '',
        status: 'approved',
      }),
    );
    const [after] = await db
      .select()
      .from(projectDeliverables)
      .where(eq(projectDeliverables.id, d!.id));
    expect(after?.title).toBe('Design v2');
    expect(after?.linkUrl).toBeNull();
  });

  test('a message posts as the admin', async () => {
    expect(
      (
        await postAdminMessageAction(
          {},
          form({ projectId, body: 'Hello from the team' }),
        )
      ).sent,
    ).toBeTruthy();
    const [message] = await db
      .select()
      .from(projectMessages)
      .where(eq(projectMessages.projectId, projectId));
    expect(message?.author).toBe('admin');
    expect(message?.adminUserId).toBe(Number(adminId));
  });

  test('the admin read queries see all of it', async () => {
    expect(
      (await listClients()).find((c) => c.id === clientId)?.totalProjects,
      'projects listed for the client',
    ).toBe(1);

    const detail = await clientDetail(clientId);
    expect(detail?.people).toHaveLength(1);
    expect(detail?.projects, 'projects on the client page').toHaveLength(1);
    expect(detail?.projects[0]?.stagesDone, 'stages done').toBe(1);

    const project = await adminProject(projectId);
    expect(project?.stages).toHaveLength(5);
    expect(project?.deliverables[0]?.status).toBe('approved');
    expect(project?.messages[0]?.authorName).toBeTruthy();
  });
});
