import path from 'node:path';

import * as typescript from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('typescript');
  vi.resetModules();
});

describe('discovery unit', () => {
  it('throws when typescript cannot be loaded', async () => {
    vi.resetModules();
    vi.doMock('typescript', () => {
      throw new Error('missing');
    });

    const { discoverGraphQLDocuments } = await import('../../src/discovery');

    await expect(
      discoverGraphQLDocuments({
        entries: ['films.ts'],
        rootDir: '.',
        tsconfigFile: './tsconfig.json',
      }),
    ).rejects.toThrow('Callsheet codegen requires `typescript`.');
  });

  it('throws when typescript returns no parsed tsconfig', async () => {
    vi.resetModules();
    vi.doMock('typescript', () => {
      const mockedTypeScript = {
        ...typescript,
        getParsedCommandLineOfConfigFile() {
          return undefined;
        },
      };

      return {
        ...mockedTypeScript,
        default: mockedTypeScript,
      };
    });

    const { discoverGraphQLDocuments } = await import('../../src/discovery');

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
