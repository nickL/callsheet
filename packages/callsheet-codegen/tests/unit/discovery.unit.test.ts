import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('typescript');
  vi.resetModules();
});

describe('discovery unit', () => {
  it('throws when typescript cannot be loaded', async () => {
    vi.doMock('typescript', () => {
      throw new Error('missing');
    });

    const { discoverGraphQLDocuments } = await import('../../src');

    await expect(
      discoverGraphQLDocuments({
        entries: ['films.ts'],
        rootDir: '.',
        tsconfigFile: './tsconfig.json',
      }),
    ).rejects.toThrow('Callsheet codegen requires `typescript`.');
  });

  it('throws when typescript returns no parsed tsconfig', async () => {
    vi.doMock('typescript', () => ({
      default: {
        getParsedCommandLineOfConfigFile() {
          return undefined;
        },
        sys: {},
      },
    }));

    const { discoverGraphQLDocuments } = await import('../../src');

    await expect(
      discoverGraphQLDocuments({
        entries: ['films.ts'],
        rootDir: '.',
        tsconfigFile: './tsconfig.json',
      }),
    ).rejects.toThrow(
      `Unable to read the Callsheet codegen tsconfig file: ${path.resolve(process.cwd(), './tsconfig.json')}`,
    );
  });
});
