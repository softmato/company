/**
 * No `'use client'` file may import a value from `@softmato/db`.
 *
 * The package's entry point re-exports `client.ts`, which imports `pg`, which
 * requires `dns`, `net`, `tls`, `fs` and `util/types`. None of those exist in
 * a browser, so a value import from a client component does not fail at the
 * import — it fails when Turbopack builds the client graph, and the page
 * answers `500` with a module-not-found trace instead of rendering.
 *
 * This is worth a test rather than a comment because **nothing else catches
 * it**. `tsc --noEmit` is happy: the module resolves and the types are right.
 * ESLint is happy. The whole suite is happy, because tests import components
 * in Node, where `pg` resolves perfectly well. The failure exists only inside
 * the bundler, and the only way to see it is to load the page — which, for
 * every screen under `/admin`, means a password and a TOTP code.
 *
 * It happened once, on `credential-panel.tsx`, when a two-entry label map was
 * added to the db package and imported by value from a client component. The
 * fix is always the same shape: the server component does the lookup and
 * passes the finished value down as a prop. `import type` is fine and stays
 * fine — types are erased before the bundler ever sees them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = join(import.meta.dirname, '..');

/** Everything the client graph can be reached from. */
const ROOTS = ['app', 'components', 'lib'];

function sourceFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;

    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      found.push(path);
    }
  }

  return found;
}

/**
 * `import type { … }` and `import { type X }` are erased; anything else in an
 * import from the db package survives into the bundle.
 *
 * The check reads the import clause rather than parsing it, because the rule
 * it enforces is that crude. A clause that types every specifier is safe and
 * passes; one that leaves a single binding un-typed is not and does not.
 *
 * **The clause is matched as a brace list or a bare identifier, never as
 * "anything up to the next `from`".** A lazy wildcard starts matching at an
 * *earlier* `import` in the file and swallows everything up to this one's
 * `from`, so `import type { CredentialMode }` two lines below an
 * `import { useActionState } from 'react'` reads as a value import. That is
 * how the first draft of this file reported three offenders when there was
 * one.
 */
function importsDbByValue(source: string): boolean {
  for (const [, typeKeyword, clause] of source.matchAll(
    /import\s+(type\s+)?(\{[^}]*\}|[A-Za-z_$][\w$]*)\s+from\s+'@softmato\/db'/g,
  )) {
    if (typeKeyword || !clause) continue;

    const specifiers = clause
      .replace(/[{}]/g, '')
      .split(',')
      .map((specifier) => specifier.trim())
      .filter(Boolean);

    if (specifiers.some((specifier) => !specifier.startsWith('type '))) {
      return true;
    }
  }

  return false;
}

describe('the client bundle never reaches the database package', () => {
  it('no client component imports a value from @softmato/db', () => {
    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const path of sourceFiles(join(APP_ROOT, root))) {
        const source = readFileSync(path, 'utf8');

        if (/^\s*'use client'/m.test(source) && importsDbByValue(source)) {
          offenders.push(path.slice(APP_ROOT.length + 1).replace(/\\/g, '/'));
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('sees the shape that broke the page, and the two that did not', () => {
    const broken =
      "'use client';\nimport { CREDENTIAL_MODE_LABEL } from '@softmato/db';";
    const typeOnly =
      "'use client';\nimport type { CredentialMode } from '@softmato/db';";
    const inlineType =
      "'use client';\nimport { type CredentialMode } from '@softmato/db';";

    expect(importsDbByValue(broken)).toBe(true);
    expect(importsDbByValue(typeOnly)).toBe(false);
    expect(importsDbByValue(inlineType)).toBe(false);
  });
});
