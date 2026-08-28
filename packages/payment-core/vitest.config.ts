import { defineConfig } from 'vitest/config';

/**
 * Everything tested here is pure: state machines, signing, identifier shapes.
 * Anything needing a database is tested in `packages/db/tests`, against real
 * Postgres (docs/TESTING.md §1).
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
