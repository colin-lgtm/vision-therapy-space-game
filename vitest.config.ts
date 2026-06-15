import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/domain/**/*.test.ts', 'tests/ui/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['electron/**', 'tests/**', 'src/**/*.d.ts'],
    },
  },
});
