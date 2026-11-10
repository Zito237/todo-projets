import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['web/test/**/*.test.js'],
    environment: 'node',
    coverage: {
      include: ['web/src/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
});
