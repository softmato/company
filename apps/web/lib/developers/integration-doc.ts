import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `docs/INTEGRATION.md`, read from git at build time.
 *
 * ## Why this is not in the CMS
 *
 * The legal documents are editable from the admin panel because a policy has
 * to be changeable without a deploy, and the person changing it is not an
 * engineer. Developer documentation is the opposite on both counts: it
 * describes code, it is only correct while it matches that code, and the
 * moment it can be edited by someone who is not editing the code, it starts
 * drifting. Keeping it in the repository means a change to the contract and a
 * change to its description travel in the same commit and the same review.
 *
 * That is the line, and it is deliberate.
 *
 * `readFileSync` at module scope is what makes it build-time: the page is
 * statically rendered, so this runs during `next build` and never on a
 * request. No database, no CMS query, no filesystem read in production.
 *
 * **In `next dev` this means editing the markdown does nothing until you
 * restart the server.** The file lives outside `apps/web`, so it is not
 * watched, and the module is only evaluated once. That is the cost of reading
 * it at build time and it is the intended trade — but it looks exactly like
 * "my edit did not save", so it is written down here rather than rediscovered.
 */
const INTEGRATION_PATH = join(
  process.cwd(),
  '..',
  '..',
  'docs',
  'INTEGRATION.md',
);

/**
 * The body with its `# Title` line removed — `PageHeader` renders the title,
 * and a second `h1` inside the article would be a duplicate heading in the
 * document outline as well as on screen.
 *
 * The relative links between docs (`./API.md`) are also rewritten out: they
 * are correct in the repository and dead on the web, and a documentation page
 * whose first link 404s does not get a second chance.
 */
export function integrationDoc(): { title: string; body: string } {
  const raw = readFileSync(INTEGRATION_PATH, 'utf8');

  const lines = raw.split('\n');
  const titleLine = lines.findIndex((line) => line.startsWith('# '));

  const title =
    titleLine >= 0
      ? (lines[titleLine] as string).slice(2).trim()
      : 'Integrating with Softmato Payments';

  const body = (titleLine >= 0 ? lines.slice(titleLine + 1) : lines)
    .join('\n')
    .trim();

  return { title, body: stripRepoLinks(body) };
}

/**
 * `[`API.md`](./API.md)` becomes `` `API.md` `` — the reference is kept, the
 * dead link is not. Only sibling-file links are touched; anything absolute or
 * anchored is left alone.
 */
function stripRepoLinks(body: string): string {
  return body.replace(/\[([^\]]+)\]\(\.\/[^)]+\.md\)/g, '$1');
}
