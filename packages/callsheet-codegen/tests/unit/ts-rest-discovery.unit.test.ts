import { describe, expect, it } from 'vitest';

import { fixturePath, normalizeSourceFile } from './test-helpers';
import { discoverTsRestRoutes } from '../../src/ts-rest-discovery';

describe('ts-rest discovery', () => {
  it('discovers contract routes and applies a path prefix', async () => {
    const routes = await discoverTsRestRoutes({
      exportName: 'contract',
      importFrom: fixturePath('generate-basic', 'src/rest/contract.ts'),
      pathPrefix: ['rest'],
    });

    expect(routes).toEqual([
      {
        exportName: 'contract',
        kind: 'query',
        path: ['rest', 'users', 'byId'],
        routePath: ['users', 'byId'],
        sourceFile: normalizeSourceFile(
          fixturePath('generate-basic', 'src/rest/contract.ts'),
        ),
      },
      {
        exportName: 'contract',
        kind: 'mutation',
        path: ['rest', 'users', 'update'],
        routePath: ['users', 'update'],
        sourceFile: normalizeSourceFile(
          fixturePath('generate-basic', 'src/rest/contract.ts'),
        ),
      },
    ]);
  });

  it('throws when the configured tsRest export is missing', async () => {
    await expect(
      discoverTsRestRoutes({
        exportName: 'missingContract',
        importFrom: fixturePath('generate-basic', 'src/rest/contract.ts'),
      }),
    ).rejects.toThrow(`Configured tsRest export was not found.`);
  });
});
