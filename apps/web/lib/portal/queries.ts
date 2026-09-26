/**
 * Every read the client portal makes about projects.
 *
 * **Each function takes the viewer's `clientId` and filters by it in SQL.**
 * A project id, document id or deliverable id from a URL is only ever looked
 * up *together with* that client id, so someone else's id finds nothing and
 * the page 404s — it never reads as "exists, but not yours"
 * (PHASES.md Phase 8, acceptance 1 and 2).
 */
import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import {
  adminUsers,
  clientUsers,
  db,
  projectDeliverables,
  projectDocuments,
  projectMessages,
  projects,
  type Project,
} from '@softmato/db';

import { projectChildren, type ProjectBundle } from '@/lib/projects/bundle';
import {
  summarizeProjects,
  type ProjectSummary,
} from '@/lib/projects/summaries';

/** Live work first, then finished, newest first within each. */
const byRelevance = [
  sql`CASE ${projects.status} WHEN 'active' THEN 0 WHEN 'on_hold' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END`,
  desc(projects.updatedAt),
];

export async function clientProjects(clientId: number): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.clientId, clientId))
    .orderBy(...byRelevance);
}

export async function clientProjectSummaries(
  clientId: number,
): Promise<ProjectSummary[]> {
  return summarizeProjects(await clientProjects(clientId));
}

export async function clientProject(
  clientId: number,
  projectId: number,
): Promise<ProjectBundle | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, clientId)))
    .limit(1);

  return project ? projectChildren(project) : null;
}

/** For a write: whether the project is theirs, without loading it. */
export async function clientOwnsProject(
  clientId: number,
  projectId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, clientId)))
    .limit(1);

  return Boolean(row);
}

/** For a download: the stored object, only if the document is theirs. */
export async function clientDocument(clientId: number, documentId: number) {
  const [row] = await db
    .select({
      id: projectDocuments.id,
      objectKey: projectDocuments.objectKey,
      fileName: projectDocuments.fileName,
      contentType: projectDocuments.contentType,
      projectId: projectDocuments.projectId,
    })
    .from(projectDocuments)
    .innerJoin(projects, eq(projects.id, projectDocuments.projectId))
    .where(
      and(eq(projectDocuments.id, documentId), eq(projects.clientId, clientId)),
    )
    .limit(1);

  return row ?? null;
}

/** For a review: the deliverable's project, only if it is theirs. */
export async function clientDeliverable(
  clientId: number,
  deliverableId: number,
) {
  const [row] = await db
    .select({
      id: projectDeliverables.id,
      projectId: projectDeliverables.projectId,
      title: projectDeliverables.title,
      status: projectDeliverables.status,
    })
    .from(projectDeliverables)
    .innerJoin(projects, eq(projects.id, projectDeliverables.projectId))
    .where(
      and(
        eq(projectDeliverables.id, deliverableId),
        eq(projects.clientId, clientId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export interface ClientDocumentRow {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: 'admin' | 'client';
  uploaderName: string;
  createdAt: Date;
  projectId: number;
  projectName: string;
}

export async function clientDocuments(
  clientId: number,
): Promise<ClientDocumentRow[]> {
  return db
    .select({
      id: projectDocuments.id,
      fileName: projectDocuments.fileName,
      contentType: projectDocuments.contentType,
      sizeBytes: projectDocuments.sizeBytes,
      uploadedBy: projectDocuments.uploadedBy,
      uploaderName: sql<string>`coalesce(${adminUsers.name}, ${clientUsers.name}, 'Someone')`,
      createdAt: projectDocuments.createdAt,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(projectDocuments)
    .innerJoin(projects, eq(projects.id, projectDocuments.projectId))
    .leftJoin(adminUsers, eq(adminUsers.id, projectDocuments.adminUserId))
    .leftJoin(clientUsers, eq(clientUsers.id, projectDocuments.clientUserId))
    .where(eq(projects.clientId, clientId))
    .orderBy(desc(projectDocuments.createdAt));
}

export interface RecentMessage {
  id: number;
  author: 'admin' | 'client';
  authorName: string;
  body: string;
  createdAt: Date;
  projectId: number;
  projectName: string;
}

export async function recentClientMessages(
  clientId: number,
  limit = 5,
): Promise<RecentMessage[]> {
  const own = db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientId, clientId));

  return db
    .select({
      id: projectMessages.id,
      author: projectMessages.author,
      authorName: sql<string>`coalesce(${adminUsers.name}, ${clientUsers.name}, 'Someone')`,
      body: projectMessages.body,
      createdAt: projectMessages.createdAt,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(projectMessages)
    .innerJoin(projects, eq(projects.id, projectMessages.projectId))
    .leftJoin(adminUsers, eq(adminUsers.id, projectMessages.adminUserId))
    .leftJoin(clientUsers, eq(clientUsers.id, projectMessages.clientUserId))
    .where(inArray(projectMessages.projectId, own))
    .orderBy(desc(projectMessages.createdAt), desc(projectMessages.id))
    .limit(limit);
}
