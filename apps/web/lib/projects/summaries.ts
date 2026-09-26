/**
 * One line per project: how far along it is and what comes next.
 *
 * Three queries for any number of projects, assembled here — not three per
 * project. Takes rows the caller has already scoped (a client's own projects,
 * or every project for the admin).
 */
import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  db,
  projectDeliverables,
  projectMilestones,
  projectStages,
  type Project,
} from '@softmato/db';

export interface ProjectSummary {
  project: Project;
  stagesTotal: number;
  stagesDone: number;
  /** The stage in progress, else the first not yet done. */
  currentStage: string | null;
  nextMilestone: { title: string; dueOn: string | null } | null;
  awaitingReview: number;
}

export async function summarizeProjects(
  projects: Project[],
): Promise<ProjectSummary[]> {
  if (projects.length === 0) return [];

  const ids = projects.map((p) => p.id);

  const [stages, milestones, reviews] = await Promise.all([
    db
      .select({
        projectId: projectStages.projectId,
        name: projectStages.name,
        status: projectStages.status,
      })
      .from(projectStages)
      .where(inArray(projectStages.projectId, ids))
      .orderBy(projectStages.position, projectStages.id),

    db
      .select({
        projectId: projectMilestones.projectId,
        title: projectMilestones.title,
        dueOn: projectMilestones.dueOn,
      })
      .from(projectMilestones)
      .where(
        and(
          inArray(projectMilestones.projectId, ids),
          isNull(projectMilestones.completedAt),
        ),
      )
      .orderBy(
        sql`${projectMilestones.dueOn} ASC NULLS LAST`,
        projectMilestones.id,
      ),

    db
      .select({
        projectId: projectDeliverables.projectId,
        n: sql<number>`count(*)::int`,
      })
      .from(projectDeliverables)
      .where(
        and(
          inArray(projectDeliverables.projectId, ids),
          eq(projectDeliverables.status, 'in_review'),
        ),
      )
      .groupBy(projectDeliverables.projectId),
  ]);

  return projects.map((project) => {
    const own = stages.filter((s) => s.projectId === project.id);
    const current =
      own.find((s) => s.status === 'in_progress') ??
      own.find((s) => s.status !== 'done');
    const milestone = milestones.find((m) => m.projectId === project.id);

    return {
      project,
      stagesTotal: own.length,
      stagesDone: own.filter((s) => s.status === 'done').length,
      currentStage: current?.name ?? null,
      nextMilestone: milestone
        ? { title: milestone.title, dueOn: milestone.dueOn }
        : null,
      awaitingReview: reviews.find((r) => r.projectId === project.id)?.n ?? 0,
    };
  });
}
