/**
 * The admin's view of agency clients. Unscoped by design — the founder sees
 * every client — and reachable only behind the admin layout and actions.
 */
import 'server-only';
import { and, asc, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm';

import {
  clientUsers,
  clients,
  db,
  invoices,
  projectMessages,
  projects,
  type Client,
} from '@softmato/db';

import { projectChildren, type ProjectBundle } from '@/lib/projects/bundle';
import {
  summarizeProjects,
  type ProjectSummary,
} from '@/lib/projects/summaries';

export interface ClientRow {
  id: number;
  name: string;
  archivedAt: Date | null;
  createdAt: Date;
  people: number;
  activeProjects: number;
  totalProjects: number;
  lastClientMessageAt: Date | null;
}

export async function listClients(): Promise<ClientRow[]> {
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      archivedAt: clients.archivedAt,
      createdAt: clients.createdAt,
      people: sql<number>`(SELECT count(*)::int FROM ${clientUsers} WHERE ${clientUsers.clientId} = ${clients.id})`,
      activeProjects: sql<number>`(SELECT count(*)::int FROM ${projects} WHERE ${projects.clientId} = ${clients.id} AND ${projects.status} IN ('active','on_hold'))`,
      totalProjects: sql<number>`(SELECT count(*)::int FROM ${projects} WHERE ${projects.clientId} = ${clients.id})`,
    })
    .from(clients)
    .orderBy(sql`${clients.archivedAt} IS NOT NULL`, asc(clients.name));

  const latest = rows.length
    ? await db
        .select({
          clientId: projects.clientId,
          at: max(projectMessages.createdAt),
        })
        .from(projectMessages)
        .innerJoin(projects, eq(projects.id, projectMessages.projectId))
        .where(
          and(
            eq(projectMessages.author, 'client'),
            inArray(
              projects.clientId,
              rows.map((r) => r.id),
            ),
          ),
        )
        .groupBy(projects.clientId)
    : [];

  return rows.map((row) => ({
    ...row,
    lastClientMessageAt: latest.find((l) => l.clientId === row.id)?.at ?? null,
  }));
}

export interface ClientPerson {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  hasPassword: boolean;
  inviteExpiresAt: Date | null;
  lastLoginAt: Date | null;
}

export interface ClientDetail {
  client: Client;
  people: ClientPerson[];
  projects: ProjectSummary[];
  invoiceCount: number;
}

export async function clientDetail(
  clientId: number,
): Promise<ClientDetail | null> {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return null;

  const [people, projectRows, [invoiceRow]] = await Promise.all([
    db
      .select({
        id: clientUsers.id,
        name: clientUsers.name,
        email: clientUsers.email,
        isActive: clientUsers.isActive,
        hasPassword: sql<boolean>`${clientUsers.passwordHash} IS NOT NULL`,
        inviteExpiresAt: clientUsers.inviteExpiresAt,
        lastLoginAt: clientUsers.lastLoginAt,
      })
      .from(clientUsers)
      .where(eq(clientUsers.clientId, clientId))
      .orderBy(asc(clientUsers.id)),
    db
      .select()
      .from(projects)
      .where(eq(projects.clientId, clientId))
      .orderBy(desc(projects.updatedAt)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.customerId, client.customerId)),
  ]);

  return {
    client,
    people,
    projects: await summarizeProjects(projectRows),
    invoiceCount: invoiceRow?.n ?? 0,
  };
}

export interface AdminProject extends ProjectBundle {
  clientName: string;
  clientArchived: boolean;
}

export async function adminProject(
  projectId: number,
): Promise<AdminProject | null> {
  const [row] = await db
    .select({
      project: projects,
      clientName: clients.name,
      archivedAt: clients.archivedAt,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row) return null;

  return {
    ...(await projectChildren(row.project)),
    clientName: row.clientName,
    clientArchived: row.archivedAt !== null,
  };
}

/** For the admin dashboard: messages from clients in the last week. */
export async function recentClientActivity(limit = 5) {
  return db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.name,
      body: projectMessages.body,
      createdAt: projectMessages.createdAt,
    })
    .from(projectMessages)
    .innerJoin(projects, eq(projects.id, projectMessages.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(
      and(eq(projectMessages.author, 'client'), isNull(clients.archivedAt)),
    )
    .orderBy(desc(projectMessages.createdAt))
    .limit(limit);
}
