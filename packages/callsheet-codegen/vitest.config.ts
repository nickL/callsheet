import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        '**/*.d.ts',
        '**/tests/**',
        '**/src/index.ts',
        '**/src/types.ts',
      ],
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
});
