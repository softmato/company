/**
 * What a preview site says about its own project: the stages and where the
 * build is. Looked up by the preview's slug, which is public — anyone with the
 * address sees the site — so this returns stage names and states only: no
 * client, no dates, no files, no messages.
 */
import 'server-only';
import { cache } from 'react';
import { asc, eq } from 'drizzle-orm';

import { db, projectStages, projects } from '@softmato/db';

export interface PreviewStatus {
  projectId: number;
  stages: { name: string; status: 'upcoming' | 'in_progress' | 'done' }[];
}

export const previewStatus = cache(
  async (slug: string): Promise<PreviewStatus | null> => {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.previewSlug, slug))
      .limit(1);

    if (!project) return null;

    const stages = await db
      .select({ name: projectStages.name, status: projectStages.status })
      .from(projectStages)
      .where(eq(projectStages.projectId, project.id))
      .orderBy(asc(projectStages.position));

    return { projectId: project.id, stages };
  },
);
