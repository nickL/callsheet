import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        '**/*.d.ts',
        '**/tests/**',
        '**/src/call-type-tag.ts',
        '**/src/call-types.ts',
        '**/src/scope.ts',
        '**/src/index.ts',
        '**/src/react-query/index.ts',
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
