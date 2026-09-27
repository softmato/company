/**
 * Which Vercel project a preview address is added to, and what Vercel's
 * answers mean. The bug this guards: every saved address used to go on
 * Softmato's own project, taking it away from the client site's project.
 */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    VERCEL_API_TOKEN: 'token',
    VERCEL_PROJECT_ID: 'prj_softmato',
    VERCEL_TEAM_ID: undefined,
  },
}));

const { claimPreviewDomain, hostingProject } =
  await import('@/lib/projects/vercel-domain');
const { IN_APP_PREVIEWS } = await import('@/lib/projects/preview');

afterEach(() => vi.unstubAllGlobals());

/** Answers the POST, then the GET that follows a refusal. */
function vercel(post: [number, object], get: [number, object] = [404, {}]) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    const [status, body] = init?.method === 'POST' ? post : get;
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
}

describe('hostingProject', () => {
  test('a linked Vercel project wins', () => {
    expect(hostingProject('acme', 'prj_acme')).toBe('prj_acme');
  });

  test('only previews built in this app go on Softmato’s project', () => {
    expect(hostingProject('himalayan-tea', null)).toBe('prj_softmato');
    expect(hostingProject('acme', null)).toBeNull();
  });

  test('IN_APP_PREVIEWS matches the folders under app/(previews)/preview', () => {
    const folders = readdirSync(
      resolve(__dirname, '../app/(previews)/preview'),
      { withFileTypes: true },
    )
      .filter((d) => d.isDirectory() && !d.name.startsWith('['))
      .map((d) => d.name)
      .sort();
    expect([...IN_APP_PREVIEWS].sort()).toEqual(folders);
  });
});

describe('claimPreviewDomain', () => {
  test('adds it to the named project', async () => {
    const calls = vercel([200, { verified: true }]);
    expect(await claimPreviewDomain('acme.softmato.com', 'prj_acme')).toBe(
      'added',
    );
    expect(calls).toEqual([
      'POST https://api.vercel.com/v10/projects/prj_acme/domains',
    ]);
  });

  test('already on this project is fine, not a failure', async () => {
    vercel([400, {}], [200, { verified: true }]);
    expect(await claimPreviewDomain('acme.softmato.com', 'prj_acme')).toBe(
      'already',
    );
  });

  test('on another project is reported, not taken for success', async () => {
    vercel([409, {}]);
    expect(await claimPreviewDomain('acme.softmato.com', 'prj_acme')).toBe(
      'taken',
    );
  });

  test('added but unverified is reported', async () => {
    vercel([200, { verified: false }]);
    expect(await claimPreviewDomain('acme.softmato.com', 'prj_acme')).toBe(
      'unverified',
    );
  });

  test('anything else fails without throwing', async () => {
    vercel([403, {}]);
    expect(await claimPreviewDomain('acme.softmato.com', 'prj_acme')).toBe(
      'failed',
    );
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline');
    });
    expect(await claimPreviewDomain('acme.softmato.com', 'prj_acme')).toBe(
      'failed',
    );
  });
});
