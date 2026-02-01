import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['test/integration/setup.ts'],
    testTimeout: 15_000,
    pool: 'forks',
    maxWorkers: 1,
    isolate: false,
  },
});
