import { defineConfig } from 'vitest/config';

/**
 * The SDK has no runtime dependencies and nothing here touches a database.
 * Everything tested is pure: signature verification and the client's request
 * shaping, the latter through an injected `fetch`.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
