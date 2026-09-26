/**
 * Builds a sample client with one project in every state the portal can show,
 * and prints an invitation link for it. For local development and previews —
 * refuses to run against production.
 *
 *   pnpm portal:demo -- --email you+demo@example.com
 *
 * Re-running creates another sample client; the email must be new each time.
 * Everything it writes is labelled "(sample)".
 */
import { eq } from 'drizzle-orm';

import {
  adminUsers,
  clientUsers,
  closeDb,
  db,
  projectDeliverables,
  projectMessages,
  projectMilestones,
  projectStages,
  projects,
} from '@softmato/db';
import { createClient } from '../apps/web/lib/clients/create';
import { agencyOrigin } from '../apps/web/lib/portal/origin';
import { hashToken, newToken } from '../apps/web/lib/portal/token';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.env.APP_ENV === 'production') {
  throw new Error(
    'portal:demo writes sample data and never runs on production.',
  );
}

const email = arg('email');
if (!email) throw new Error('Usage: pnpm portal:demo -- --email <email>');

const [admin] = await db
  .select({ id: adminUsers.id })
  .from(adminUsers)
  .limit(1);
if (!admin)
  throw new Error('Create an admin first — the sample thread needs one.');

const { clientId, userId } = await createClient({
  name: 'Himalayan Tea Co. (sample)',
  contactName: 'Asha Gurung',
  contactEmail: email,
});

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const [project] = await db
  .insert(projects)
  .values({
    clientId,
    name: 'Online shop and wholesale ordering',
    summary:
      'A storefront for retail customers, and a private ordering page for wholesale buyers with their own price list.',
    startsOn: day(-40),
    dueOn: day(50),
  })
  .returning({ id: projects.id });

await db.insert(projects).values({
  clientId,
  name: 'Brand refresh',
  summary: 'New logo lockups and packaging labels.',
  status: 'completed',
  startsOn: day(-120),
  dueOn: day(-60),
});

const stages = [
  ['Discovery', 'Workshops, product catalogue and pricing rules.', 'done'],
  ['Design', 'Page layouts and the ordering flow, reviewed with you.', 'done'],
  [
    'Build',
    'Storefront, wholesale portal and payment integration.',
    'in_progress',
  ],
  ['Testing', 'Your team tries every flow on phones and desktops.', 'upcoming'],
  ['Launch', 'Go live, then two weeks of close support.', 'upcoming'],
] as const;

await db.insert(projectStages).values(
  stages.map(([name, description, status], position) => ({
    projectId: project!.id,
    position,
    name,
    description,
    status,
    completedAt:
      status === 'done'
        ? new Date(Date.now() - (30 - position * 10) * 86_400_000)
        : null,
  })),
);

await db.insert(projectMilestones).values([
  {
    projectId: project!.id,
    title: 'Designs signed off',
    dueOn: day(-12),
    completedAt: new Date(Date.now() - 12 * 86_400_000),
  },
  {
    projectId: project!.id,
    title: 'Staging site ready for testing',
    dueOn: day(9),
  },
  { projectId: project!.id, title: 'Go live', dueOn: day(50) },
]);

await db.insert(projectDeliverables).values([
  {
    projectId: project!.id,
    title: 'Wholesale ordering flow — clickable prototype',
    description:
      'Log in as a wholesale buyer, build an order from the price list, and submit it.',
    linkUrl: 'https://example.com/prototype',
    status: 'in_review',
  },
  {
    projectId: project!.id,
    title: 'Homepage and product page designs',
    status: 'approved',
    reviewedAt: new Date(Date.now() - 12 * 86_400_000),
    reviewedBy: userId,
  },
  {
    projectId: project!.id,
    title: 'Payment integration',
    status: 'in_progress',
  },
]);

await db.insert(projectMessages).values([
  {
    projectId: project!.id,
    author: 'admin',
    adminUserId: admin.id,
    body: 'Welcome aboard! This thread is where we will share progress and questions.',
  },
  {
    projectId: project!.id,
    author: 'client',
    clientUserId: userId,
    body: 'Thanks — the designs look great. Can wholesale buyers see stock levels?',
  },
  {
    projectId: project!.id,
    author: 'admin',
    adminUserId: admin.id,
    body: 'Yes. The prototype is ready for your review above — stock shows on each product row.',
  },
]);

const token = newToken();
await db
  .update(clientUsers)
  .set({
    inviteTokenHash: hashToken(token),
    inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000),
  })
  .where(eq(clientUsers.id, userId));

const base = (
  process.env.PORTAL_URL ??
  agencyOrigin(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
).replace(/\/$/, '');

console.log(`Sample client ${clientId} created for ${email}.`);
console.log(`Invitation link (7 days): ${base}/invite/${token}`);

await closeDb();
