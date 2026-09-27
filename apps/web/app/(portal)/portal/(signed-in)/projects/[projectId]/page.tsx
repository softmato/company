/**
 * One project, for the client it belongs to.
 *
 * The id in the URL is looked up together with the viewer's client id, so a
 * changed number is a 404 — never another client's project (Phase 8,
 * acceptance 2).
 *
 * It re-reads itself when the client returns to the tab, so a stage moved or
 * a new deploy appears — and the preview reloads — without them reloading.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RefreshOnReturn } from '@/components/portal/refresh-on-return';
import { ProjectView } from '@/components/portal/project-view';
import { env } from '@/lib/env';
import { clientProject } from '@/lib/portal/queries';
import { requireViewer } from '@/lib/portal/session';
import { previewUrl } from '@/lib/projects/preview';

export const metadata: Metadata = { title: 'Project' };

export default async function PortalProjectPage({
  params,
}: PageProps<'/portal/projects/[projectId]'>) {
  const viewer = await requireViewer();
  const projectId = Number((await params).projectId);

  const bundle =
    Number.isInteger(projectId) && projectId > 0
      ? await clientProject(viewer.clientId, projectId)
      : null;

  if (!bundle) notFound();

  const slug = bundle.project.previewSlug;

  return (
    <>
      <RefreshOnReturn />
      <ProjectView
        bundle={bundle}
        previewSrc={slug ? previewUrl(slug, env.NEXT_PUBLIC_APP_URL) : null}
      />
    </>
  );
}
