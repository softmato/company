/**
 * `POST /api/webhooks/github` — a client site finished a production deploy.
 *
 * Set up once on the GitHub organisation (Settings → Webhooks): payload URL
 * this route, content type `application/json`, the secret stored as
 * `GITHUB_WEBHOOK_SECRET`, and only the "Deployment statuses" event.
 * Nothing runs between deploys, so it costs no Vercel usage while idle.
 */
import { env } from '@/lib/env';
import { projectForVercel, recordDeploys } from '@/lib/projects/deploys';
import {
  productionSha,
  verifyGithubSignature,
} from '@/lib/projects/github-webhook';
import { productionDeploysOf } from '@/lib/projects/vercel-deploys';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret)
    return Response.json({ error: 'Not configured' }, { status: 503 });

  const raw = await request.text();
  if (
    !verifyGithubSignature(
      raw,
      request.headers.get('x-hub-signature-256'),
      secret,
    )
  )
    return Response.json({ error: 'Invalid signature' }, { status: 403 });

  // `ping` on setup, and any event ticked by mistake: acknowledged, ignored.
  if (request.headers.get('x-github-event') !== 'deployment_status')
    return Response.json({ recorded: 0 });

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Not JSON' }, { status: 400 });
  }

  const sha = productionSha(event);
  if (!sha) return Response.json({ recorded: 0 });

  let recorded = 0;
  for (const { vercelProjectId, deploy } of await productionDeploysOf(sha)) {
    const projectId = await projectForVercel(vercelProjectId);
    if (projectId) recorded += await recordDeploys(projectId, [deploy]);
  }
  return Response.json({ recorded });
}
