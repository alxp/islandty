const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['vendor/**', 'node_modules/**', 'tests/output/**'],
    fileParallelism: false,
  },
});
