import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Same single root .env.local the app loads (see next.config.ts).
const envPath = resolve(__dirname, '../../.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match as unknown as [string, string, string];
    process.env[key] ??= rawValue.replace(/^["']|["']$/g, '');
  }
}

export default defineConfig({
  test: {
    /*
     * `.tsx` as well, so the invoice and receipt layouts are testable. They
     * are React components rendered to a string — the one part of a money
     * document a unit test can actually assert about, and the part where a
     * regression (a dropped total, a missing PAN line) reaches a customer.
     */
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname),
      /*
       * `server-only` throws on import unless the bundler resolves it under
       * React's `react-server` condition, which vitest does not set. Without
       * this alias every module that guards itself with it — the CMS queries,
       * the metadata builders, the whole SEO layer — is untestable, which is
       * exactly backwards: those are the modules where a mistake ships
       * silently to a crawler rather than failing loudly in a browser.
       *
       * Aliasing to the package's own empty entry point, not to a stub of our
       * own, so this cannot drift from what `server-only` actually exports.
       */
      'server-only': resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
});
