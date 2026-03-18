import { expect, it, vi } from 'vitest';

import { discoverGraphQLDocuments } from '../../src';

vi.mock('typescript', () => ({
  default: undefined,
  createProgram() {
    return {
      getSourceFile() {
        return undefined;
      },
      getTypeChecker() {
        return {
          getExportsOfModule() {
            return [];
          },
          getSymbolAtLocation() {
            return undefined;
          },
        };
      },
    };
  },
  getParsedCommandLineOfConfigFile() {
    return {
      fileNames: [],
      options: {},
    };
  },
  sys: {
    readDirectory() {
      return [];
    },
  },
}));

it('supports a typescript module without a default export', async () => {
  await expect(
    discoverGraphQLDocuments({
      entries: ['films.ts'],
      rootDir: '.',
      tsconfigFile: './tsconfig.json',
    }),
  ).resolves.toEqual([]);
});
