import { expect, it, vi } from 'vitest';

import { discoverGraphQLDocuments } from '../../src';

vi.mock('typescript', () => ({
  default: {
    formatDiagnostic(
      _diagnostic: unknown,
      host: {
        getCanonicalFileName(fileName: string): string;
        getCurrentDirectory(): string;
        getNewLine(): string;
      },
    ) {
      return [
        host.getCanonicalFileName('tsconfig.json'),
        host.getCurrentDirectory(),
        host.getNewLine(),
        'bad config',
      ].join('');
    },
    getParsedCommandLineOfConfigFile(
      _tsconfigFile: string,
      _options: unknown,
      host: { onUnRecoverableConfigFileDiagnostic(diagnostic: unknown): never },
    ) {
      host.onUnRecoverableConfigFileDiagnostic({});
    },
    sys: {},
  },
}));

it('formats unrecoverable tsconfig diagnostics', async () => {
  await expect(
    discoverGraphQLDocuments({
      entries: ['films.ts'],
      rootDir: '.',
      tsconfigFile: './tsconfig.json',
    }),
  ).rejects.toThrow(`tsconfig.json${process.cwd()}\nbad config`);
});
