import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js', 'tests/**/*.test.js'],
    exclude: ['vendor/**', 'node_modules/**', 'tests/output/**'],
    fileParallelism: false,
  },
});
