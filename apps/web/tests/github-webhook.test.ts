/**
 * The GitHub deployment webhook, on the wire and against the real database,
 * with Vercel's API stubbed.
 *
 * A public URL anyone can POST to, so the rejecting half matters as much as
 * the recording half: no header, wrong secret and a tampered body do nothing;
 * previews and other events cost no Vercel call; a redelivery emails nobody.
 */
import { createHmac } from 'node:crypto';

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import { eq } from 'drizzle-orm';

import {
  clientUsers,
  clients,
  customers,
  db,
  projectDeployments,
  projects,
} from '@softmato/db';

const SECRET = vi.hoisted(() => {
  process.env.GITHUB_WEBHOOK_SECRET = 'gh-test-only';
  process.env.VERCEL_API_TOKEN = 'test-token';
  return 'gh-test-only';
});

const notified: { projectId: number; summary: string }[] = [];

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/portal/notify', () => ({
  notifyClientOfDeploy: (projectId: number, summary: string) =>
    notified.push({ projectId, summary }),
}));

const { POST } = await import('@/app/api/webhooks/github/route');
const { createClient } = await import('@/lib/clients/create');
const { productionSha, verifyGithubSignature } =
  await import('@/lib/projects/github-webhook');

const run = Math.random().toString(36).slice(2, 10);
const vercelProjectId = `prj_gh${run}`;
const sha = createHmac('sha1', run).update('commit').digest('hex');
let clientId = 0;
let projectId = 0;
let vercelCalls = 0;

function status(environment = 'Production', state = 'success') {
  return {
    action: 'created',
    deployment_status: { state, environment },
    deployment: { sha, environment },
  };
}

function post(
  body: unknown,
  {
    event = 'deployment_status',
    signature,
  }: { event?: string; signature?: string | null } = {},
): Promise<Response> {
  const raw = JSON.stringify(body);
  const headers = new Headers({
    'content-type': 'application/json',
    'x-github-event': event,
  });
  const sig =
    signature === undefined
      ? `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`
      : signature;
  if (sig !== null) headers.set('x-hub-signature-256', sig);
  return POST(
    new Request('http://localhost/api/webhooks/github', {
      method: 'POST',
      headers,
      body: raw,
    }),
  );
}

/** Vercel knows this commit as a production deploy of ours and of another. */
function vercelKnowsTheCommit() {
  vi.stubGlobal('fetch', async () => {
    vercelCalls++;
    return Response.json({
      deployments: [
        {
          uid: `dpl_${run}`,
          projectId: vercelProjectId,
          created: Date.now() - 60_000,
          ready: Date.now() - 30_000,
          meta: { githubCommitMessage: 'Add wholesale page\n\nlong body' },
        },
        {
          uid: `dpl_other_${run}`,
          projectId: `prj_unlinked${run}`,
          created: Date.now(),
        },
      ],
    });
  });
}

const deploysFor = () =>
  db
    .select()
    .from(projectDeployments)
    .where(eq(projectDeployments.projectId, projectId));

beforeAll(async () => {
  ({ clientId } = await createClient({
    name: `GitHub ${run}`,
    contactName: 'GitHub Person',
    contactEmail: `github-${run}@example.com`,
  }));
  const [project] = await db
    .insert(projects)
    .values({ clientId, name: `Site ${run}`, vercelProjectId })
    .returning({ id: projects.id });
  projectId = project!.id;
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  await db.delete(projects).where(eq(projects.clientId, clientId));
  await db.delete(clientUsers).where(eq(clientUsers.clientId, clientId));
  const [client] = await db
    .delete(clients)
    .where(eq(clients.id, clientId))
    .returning({ customerId: clients.customerId });
  if (client)
    await db.delete(customers).where(eq(customers.id, client.customerId));
});

describe('signature', () => {
  const raw = JSON.stringify(status());
  const good = `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`;

  test('accepts only the exact HMAC-SHA256 of the raw body', () => {
    expect(verifyGithubSignature(raw, good, SECRET)).toBe(true);
    expect(verifyGithubSignature(raw, null, SECRET)).toBe(false);
    expect(verifyGithubSignature(raw, undefined, SECRET)).toBe(false);
    expect(verifyGithubSignature(raw, good.slice(7), SECRET)).toBe(false);
    expect(verifyGithubSignature(`${raw} `, good, SECRET)).toBe(false);
    expect(verifyGithubSignature(raw, good, 'another-secret')).toBe(false);
  });
});

describe('which events count', () => {
  test('a successful production deploy, including a named one', () => {
    expect(productionSha(status())).toBe(sha);
    expect(productionSha(status('Production – company'))).toBe(sha);
  });

  test('previews, unfinished or failed deploys and junk do not', () => {
    expect(productionSha(status('Preview'))).toBeNull();
    expect(productionSha(status('Production', 'pending'))).toBeNull();
    expect(productionSha(status('Production', 'failure'))).toBeNull();
    expect(productionSha(null)).toBeNull();
  });
});

describe('POST /api/webhooks/github', () => {
  test('refuses a missing, wrong or tampered signature, and calls nobody', async () => {
    vercelKnowsTheCommit();
    expect((await post(status(), { signature: null })).status).toBe(403);
    expect(
      (await post(status(), { signature: `sha256=${'f'.repeat(64)}` })).status,
    ).toBe(403);
    const signedOther = `sha256=${createHmac('sha256', SECRET).update('{}').digest('hex')}`;
    expect((await post(status(), { signature: signedOther })).status).toBe(403);

    expect(vercelCalls).toBe(0);
    expect(await deploysFor()).toHaveLength(0);
  });

  test('pings, previews and pending statuses cost no Vercel call', async () => {
    vercelKnowsTheCommit();
    for (const res of [
      await post({ zen: 'hi' }, { event: 'ping' }),
      await post(status('Preview')),
      await post(status('Production', 'in_progress')),
    ]) {
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ recorded: 0 });
    }
    expect(vercelCalls).toBe(0);
  });

  test('records the linked project’s deploy once, however often it is sent', async () => {
    vercelKnowsTheCommit();
    expect(await (await post(status())).json()).toEqual({ recorded: 1 });
    expect(await (await post(status())).json()).toEqual({ recorded: 0 });

    const rows = await deploysFor();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.summary).toBe('Add wholesale page');
    expect(notified).toEqual([{ projectId, summary: 'Add wholesale page' }]);
  });
});
