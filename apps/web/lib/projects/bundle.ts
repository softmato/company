/**
 * Everything on a project page, for a project the caller has already
 * authorised.
 *
 * **Takes a project id and trusts it.** That is safe only because nothing
 * outside `lib/portal/queries.ts` and the admin project loader calls it, and
 * both decide ownership first. A portal page must never call this directly.
 */
import 'server-only';
import { asc, desc, eq, sql } from 'drizzle-orm';

import {
  adminUsers,
  clientUsers,
  db,
  projectDeliverables,
  projectDocuments,
  projectMessages,
  projectMilestones,
  projectStages,
  type Project,
} from '@softmato/db';

import type { DeliverableStatus, StageStatus } from './labels';

export interface StageView {
  id: number;
  position: number;
  name: string;
  description: string;
  status: StageStatus;
  completedAt: Date | null;
}

export interface MilestoneView {
  id: number;
  title: string;
  /** `YYYY-MM-DD`. */
  dueOn: string | null;
  completedAt: Date | null;
}

export interface DeliverableView {
  id: number;
  title: string;
  description: string;
  linkUrl: string | null;
  status: DeliverableStatus;
  reviewedAt: Date | null;
  reviewerName: string | null;
}

export interface DocumentView {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: 'admin' | 'client';
  uploaderName: string;
  createdAt: Date;
}

export interface MessageView {
  id: number;
  author: 'admin' | 'client';
  authorName: string;
  body: string;
  createdAt: Date;
}

export interface ProjectBundle {
  project: Project;
  stages: StageView[];
  milestones: MilestoneView[];
  deliverables: DeliverableView[];
  documents: DocumentView[];
  messages: MessageView[];
}

/** Whoever it was — the admin or the client person — by name. */
const personName = sql<string>`coalesce(${adminUsers.name}, ${clientUsers.name}, 'Someone')`;

export async function projectChildren(
  project: Project,
): Promise<ProjectBundle> {
  const id = project.id;

  const [stages, milestones, deliverables, documents, messages] =
    await Promise.all([
      db
        .select({
          id: projectStages.id,
          position: projectStages.position,
          name: projectStages.name,
          description: projectStages.description,
          status: projectStages.status,
          completedAt: projectStages.completedAt,
        })
        .from(projectStages)
        .where(eq(projectStages.projectId, id))
        .orderBy(asc(projectStages.position), asc(projectStages.id)),

      db
        .select({
          id: projectMilestones.id,
          title: projectMilestones.title,
          dueOn: projectMilestones.dueOn,
          completedAt: projectMilestones.completedAt,
        })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, id))
        .orderBy(
          sql`${projectMilestones.dueOn} ASC NULLS LAST`,
          asc(projectMilestones.id),
        ),

      db
        .select({
          id: projectDeliverables.id,
          title: projectDeliverables.title,
          description: projectDeliverables.description,
          linkUrl: projectDeliverables.linkUrl,
          status: projectDeliverables.status,
          reviewedAt: projectDeliverables.reviewedAt,
          reviewerName: clientUsers.name,
        })
        .from(projectDeliverables)
        .leftJoin(
          clientUsers,
          eq(clientUsers.id, projectDeliverables.reviewedBy),
        )
        .where(eq(projectDeliverables.projectId, id))
        .orderBy(desc(projectDeliverables.createdAt)),

      db
        .select({
          id: projectDocuments.id,
          fileName: projectDocuments.fileName,
          contentType: projectDocuments.contentType,
          sizeBytes: projectDocuments.sizeBytes,
          uploadedBy: projectDocuments.uploadedBy,
          uploaderName: personName,
          createdAt: projectDocuments.createdAt,
        })
        .from(projectDocuments)
        .leftJoin(adminUsers, eq(adminUsers.id, projectDocuments.adminUserId))
        .leftJoin(
          clientUsers,
          eq(clientUsers.id, projectDocuments.clientUserId),
        )
        .where(eq(projectDocuments.projectId, id))
        .orderBy(desc(projectDocuments.createdAt)),

      db
        .select({
          id: projectMessages.id,
          author: projectMessages.author,
          authorName: personName,
          body: projectMessages.body,
          createdAt: projectMessages.createdAt,
        })
        .from(projectMessages)
        .leftJoin(adminUsers, eq(adminUsers.id, projectMessages.adminUserId))
        .leftJoin(clientUsers, eq(clientUsers.id, projectMessages.clientUserId))
        .where(eq(projectMessages.projectId, id))
        .orderBy(asc(projectMessages.createdAt), asc(projectMessages.id)),
    ]);

  return { project, stages, milestones, deliverables, documents, messages };
}
