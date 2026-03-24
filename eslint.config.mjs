import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import { fileURLToPath } from 'node:url';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import testingLibrary from 'eslint-plugin-testing-library';
import tseslint from 'typescript-eslint';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const tsSourceFiles = ['**/*.{ts,tsx,mts,cts}'];
const jsSourceFiles = ['**/*.{js,mjs,cjs}'];
const appFiles = ['apps/example-app/**/*.{ts,tsx}'];
const reactTestFiles = ['apps/example-app/**/*.test.{ts,tsx}'];
const testFiles = [
  '**/*.test.{ts,tsx}',
  '**/tests/**/*.{ts,tsx}',
  '**/test-d/**/*.{ts,tsx}',
];
const nodeFiles = [
  '**/*.config.{ts,mts,cts,mjs,cjs,js}',
  'apps/*/scripts/**/*.{ts,mts,cts,mjs,cjs,js}',
  'packages/*/scripts/**/*.{ts,mts,cts,mjs,cjs,js}',
];

export default tseslint.config(
  {
    ignores: [
      '.internal/**',
      '**/.next/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/out/**',
      'apps/docs/.source/**',
      'apps/docs/next-env.d.ts',
      'apps/example-app/src/generated/**',
      'apps/example-app/src/graphql/generated.ts',
      '**/tests/fixtures/**',
      '**/tests/.tmp/**',
      '**/.vite/**',
      '**/test-d/**',
      '**/*.bundled_*.mjs',
      'tmp-*/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: tsSourceFiles,
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: tsSourceFiles,
  })),
  {
    files: tsSourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'packages/callsheet/test-d/*.test-d.ts',
            'packages/callsheet-react-query/tests/react-query.test.ts',
          ],
          defaultProject: 'tsconfig.base.json',
        },
        tsconfigRootDir: rootDir,
      },
      sourceType: 'module',
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/core-modules': ['fumadocs-mdx:collections/server'],
      'import/resolver': {
        node: true,
        typescript: {
          project: ['tsconfig.base.json'],
        },
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type',
          ],
        },
      ],
    },
  },
  {
    files: jsSourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    files: appFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.vitest,
      },
    },
    plugins: {
      vitest,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/prefer-called-with': 'error',
    },
  },
  {
    files: reactTestFiles,
    plugins: {
      'testing-library': testingLibrary,
    },
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
    },
  },
  eslintConfigPrettier,
);
