import { describe, expect, it } from 'vitest';

import { fixturePath, normalizeSourceFile } from './test-helpers';
import {
  createTsRestCoreLoadError,
  discoverTsRestRoutes,
} from '../../src/ts-rest-discovery';

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

  it('adds error msg for ts-rest load failures', () => {
    const error = createTsRestCoreLoadError(
      new Error("Cannot find package 'zod'"),
    );

    expect(error.message).toContain(
      'Callsheet codegen could not load `@ts-rest/core` for tsRest sources.',
    );
    expect(error.message).toContain(
      "along with any required peer dependencies for the version you're using",
    );
    expect(error.message).toContain(
      "Original error: Cannot find package 'zod'",
    );
  });
});
