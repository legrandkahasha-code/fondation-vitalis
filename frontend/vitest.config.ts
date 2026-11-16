import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/app/modules/landing/**/*.spec.ts'],
    environment: 'node',
    globals: true,
  },
});
