import { defineConfig } from 'vitest/config';

/**
 * Posting rules are pure: they build a journal and post nothing, so they are
 * tested here without a database. Whether the journal then *commits* — balance,
 * period status, immutability — is the database's guarantee and is tested in
 * `packages/db/tests` against real Postgres (docs/TESTING.md §1).
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
