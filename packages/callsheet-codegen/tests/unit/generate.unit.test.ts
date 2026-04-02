import { describe, expect, it } from 'vitest';

import { fixturePath, normalizeSourceFile } from './test-helpers';
import {
  buildGeneratedEntries,
  planGeneratedModule,
  prepareGenerationConfig,
  renderModuleSource,
  validateGeneratedEntries,
} from '../../src/generate-pipeline';

import type {
  DiscoveredSourceEntry,
  GeneratedCallOverride,
  GeneratedCallOverrideEntry,
  GeneratedCallsheetEntryOrigin,
  SourceImportReference,
} from '../../src/types';

function createConfig(overrides: readonly GeneratedCallOverride[] = []) {
  return prepareGenerationConfig({
    adapter: 'react-query',
    outputFile: fixturePath('generate-basic', 'src/generated/calls.ts'),
    overrides,
    sources: {
      graphql: [],
    },
  });
}

function createGraphQLDocumentOrigin(
  exportName: string,
  sourceFile: string,
): GeneratedCallsheetEntryOrigin {
  return {
    kind: 'graphqlDocument',
    exportName,
    sourceFile,
  };
}

function createTsRestRouteOrigin(
  exportName: string,
  sourceFile: string,
  routePath: readonly string[],
): GeneratedCallsheetEntryOrigin {
  return {
    kind: 'tsRestRoute',
    exportName,
    routePath,
    sourceFile,
  };
}

function createEntry(
  partial: Partial<DiscoveredSourceEntry> & Pick<DiscoveredSourceEntry, 'path'>,
): DiscoveredSourceEntry {
  const { path, ...rest } = partial;
  const sourceFile = normalizeSourceFile(
    fixturePath('generate-basic', 'src/graphql/films.ts'),
  );
  const exportName = 'FeaturedFilmsDocument';

  return {
    builderImportFrom: '@callsheet/react-query',
    origin: createGraphQLDocumentOrigin(exportName, sourceFile),
    path,
    sourceImport: {
      filePath: fixturePath('generate-basic', 'src/graphql/films.ts'),
      name: exportName,
    },
    ...rest,
  };
}

function createOverrideEntry(
  exportName: string,
  sourceFile: string,
): GeneratedCallOverrideEntry {
  return {
    kind: 'graphqlDocument',
    exportName,
    sourceFile,
  };
}

function createGeneratedEntry(partial: {
  builder?: 'query' | 'mutation';
  builderImportFrom?: string;
  callsheetPath: readonly string[];
  options?: { from: string; name: string };
  origin?: GeneratedCallsheetEntryOrigin;
  sourceImport?: SourceImportReference;
}) {
  const sourceImport = partial.sourceImport ?? {
    filePath: fixturePath('generate-basic', 'src/graphql/films.ts'),
    name: 'FeaturedFilmsDocument',
  };

  return {
    builder: partial.builder ?? 'query',
    builderImportFrom: partial.builderImportFrom ?? '@callsheet/react-query',
    callsheetPath: partial.callsheetPath,
    ...(partial.options === undefined ? {} : { options: partial.options }),
    origin:
      partial.origin ??
      createGraphQLDocumentOrigin(
        sourceImport.name,
        normalizeSourceFile(sourceImport.filePath),
      ),
    sourceImport,
  };
}

function createTsRestGeneratedEntry(memberPath: readonly string[]) {
  return createGeneratedEntry({
    builderImportFrom: '@callsheet/react-query',
    callsheetPath: ['rest', 'users', 'byId'],
    origin: createTsRestRouteOrigin(
      'contract',
      normalizeSourceFile(
        fixturePath('generate-basic', 'src/rest/contract.ts'),
      ),
      memberPath,
    ),
    sourceImport: {
      filePath: fixturePath('generate-basic', 'src/rest/contract.ts'),
      memberPath,
      name: 'contract',
    },
  });
}

describe('generate unit', () => {
  it('uses the configured adapter to resolve generated imports', () => {
    const preparedConfig = prepareGenerationConfig({
      adapter: 'swr',
      outputFile: fixturePath('generate-basic', 'src/generated/calls.ts'),
      sources: {
        graphql: [],
      },
    });

    expect(preparedConfig.importFrom).toBe('@callsheet/swr');
  });

  it('throws when both adapter and importFrom are set', () => {
    expect(() =>
      prepareGenerationConfig({
        adapter: 'react-query',
        importFrom: '@callsheet/swr',
        outputFile: fixturePath('generate-basic', 'src/generated/calls.ts'),
        sources: {
          graphql: [],
        },
      } as unknown as Parameters<typeof prepareGenerationConfig>[0]),
    ).toThrow(
      'Callsheet codegen output target is ambiguous. Set either adapter or importFrom, not both.',
    );
  });

  it('throws when neither adapter nor importFrom is set', () => {
    expect(() =>
      prepareGenerationConfig({
        outputFile: fixturePath('generate-basic', 'src/generated/calls.ts'),
        sources: {
          graphql: [],
        },
      } as unknown as Parameters<typeof prepareGenerationConfig>[0]),
    ).toThrow(
      'Callsheet codegen output target is required. Set either adapter or importFrom.',
    );
  });

  it('matches overrides by generated path', () => {
    const preparedConfig = createConfig([
      {
        path: ['filmById'],
        as: ['films', 'byId'],
        kind: 'query',
        options: {
          from: '../callsheet-options/films',
          name: 'filmByIdOptions',
        },
      },
    ]);

    const result = buildGeneratedEntries(
      [
        createEntry({
          origin: createGraphQLDocumentOrigin(
            'FilmByIdDocument',
            normalizeSourceFile(
              fixturePath('generate-basic', 'src/graphql/film-by-id.ts'),
            ),
          ),
          path: ['filmById'],
          sourceImport: {
            filePath: fixturePath(
              'generate-basic',
              'src/graphql/film-by-id.ts',
            ),
            name: 'FilmByIdDocument',
          },
        }),
      ],
      preparedConfig,
    );

    expect(result.entries).toEqual([
      {
        builder: 'query',
        builderImportFrom: '@callsheet/react-query',
        callsheetPath: ['films', 'byId'],
        options: {
          from: '../callsheet-options/films',
          name: 'filmByIdOptions',
        },
        origin: {
          kind: 'graphqlDocument',
          exportName: 'FilmByIdDocument',
          sourceFile: normalizeSourceFile(
            fixturePath('generate-basic', 'src/graphql/film-by-id.ts'),
          ),
        },
        sourceImport: {
          filePath: fixturePath('generate-basic', 'src/graphql/film-by-id.ts'),
          name: 'FilmByIdDocument',
        },
      },
    ]);
  });

  it('throws when an override does not match a generated path', () => {
    const preparedConfig = createConfig([
      {
        kind: 'query',
        path: ['missingDocument'],
      },
    ]);

    const result = buildGeneratedEntries(
      [
        createEntry({
          kind: 'query',
          path: ['featuredFilms'],
        }),
      ],
      preparedConfig,
    );

    expect(() => validateGeneratedEntries(result, preparedConfig)).toThrow(
      [
        'Some overrides did not match a generated path.',
        '  missingDocument',
      ].join('\n'),
    );
  });

  it('throws when a discovered source kind cannot be inferred and no kind override is provided', () => {
    expect(() =>
      buildGeneratedEntries(
        [
          createEntry({
            origin: createGraphQLDocumentOrigin(
              'FilmByIdDocument',
              normalizeSourceFile(
                fixturePath('generate-basic', 'src/graphql/unknown-kind.ts'),
              ),
            ),
            path: ['unknownKind', 'filmById'],
            sourceImport: {
              filePath: fixturePath(
                'generate-basic',
                'src/graphql/unknown-kind.ts',
              ),
              name: 'FilmByIdDocument',
            },
          }),
        ],
        createConfig(),
      ),
    ).toThrow(
      [
        'Could not tell whether this discovered entry should use a query or mutation builder.',
        '  Path: unknownKind.filmById',
        `  Origin: ${normalizeSourceFile(
          fixturePath('generate-basic', 'src/graphql/unknown-kind.ts'),
        )}#FilmByIdDocument`,
        'Add an explicit kind override for this generated path.',
      ].join('\n'),
    );
  });

  it('throws when duplicate overrides target the same generated path', () => {
    expect(() =>
      createConfig([
        {
          kind: 'query',
          path: ['featuredFilms'],
        },
        {
          kind: 'query',
          path: ['featuredFilms'],
        },
      ]),
    ).toThrow(
      ['Two overrides target the same generated path.', '  featuredFilms'].join(
        '\n',
      ),
    );
  });

  it('allows different aliases for two document exports that share one generated path', () => {
    const firstSourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/films.ts'),
    );
    const secondSourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/shared.ts'),
    );
    const preparedConfig = createConfig([
      {
        path: ['films', 'filmById'],
        entry: createOverrideEntry('FilmByIdDocument', firstSourceFile),
        as: ['films', 'byId'],
        kind: 'query',
      },
      {
        path: ['films', 'filmById'],
        entry: createOverrideEntry('SharedFilmByIdDocument', secondSourceFile),
        as: ['films', 'sharedById'],
        kind: 'query',
      },
    ]);
    const result = buildGeneratedEntries(
      [
        createEntry({
          kind: 'query',
          origin: createGraphQLDocumentOrigin(
            'FilmByIdDocument',
            firstSourceFile,
          ),
          path: ['films', 'filmById'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/films.ts'),
            name: 'FilmByIdDocument',
          },
        }),
        createEntry({
          kind: 'query',
          origin: createGraphQLDocumentOrigin(
            'SharedFilmByIdDocument',
            secondSourceFile,
          ),
          path: ['films', 'filmById'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/shared.ts'),
            name: 'SharedFilmByIdDocument',
          },
        }),
      ],
      preparedConfig,
    );

    expect(result.entries.map((entry) => entry.callsheetPath)).toEqual([
      ['films', 'byId'],
      ['films', 'sharedById'],
    ]);
    expect(() =>
      validateGeneratedEntries(result, preparedConfig),
    ).not.toThrow();
  });

  it('throws on generated path collisions', () => {
    const preparedConfig = createConfig();
    const result = buildGeneratedEntries(
      [
        createEntry({
          kind: 'query',
          path: ['films', 'filmById'],
        }),
        createEntry({
          kind: 'query',
          origin: createGraphQLDocumentOrigin(
            'SharedFilmByIdDocument',
            normalizeSourceFile(
              fixturePath('generate-basic', 'src/graphql/films.ts'),
            ),
          ),
          path: ['films', 'filmById'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/films.ts'),
            name: 'SharedFilmByIdDocument',
          },
        }),
      ],
      preparedConfig,
    );

    expect(() => validateGeneratedEntries(result, preparedConfig)).toThrow(
      'Two generated entries use the same path: "films.filmById".',
    );
  });

  it('throws when one generated path would be both a leaf and a namespace', () => {
    const sourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/root.ts'),
    );
    const preparedConfig = createConfig();
    const result = buildGeneratedEntries(
      [
        createEntry({
          kind: 'query',
          origin: createGraphQLDocumentOrigin('FilmsDocument', sourceFile),
          path: ['films'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/root.ts'),
            name: 'FilmsDocument',
          },
        }),
        createEntry({
          kind: 'query',
          origin: createGraphQLDocumentOrigin(
            'FeaturedFilmsDocument',
            sourceFile,
          ),
          path: ['films', 'featured'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/root.ts'),
            name: 'FeaturedFilmsDocument',
          },
        }),
      ],
      preparedConfig,
    );

    expect(() => validateGeneratedEntries(result, preparedConfig)).toThrow(
      'Generated paths conflict: "films" and "films.featured".',
    );
  });

  it('throws when an aliased path creates an empty generated path segment', () => {
    const preparedConfig = createConfig([
      {
        path: ['featuredFilms'],
        as: ['films', ''],
      },
    ]);
    const result = buildGeneratedEntries(
      [
        createEntry({
          kind: 'query',
          path: ['featuredFilms'],
        }),
      ],
      preparedConfig,
    );

    expect(() => validateGeneratedEntries(result, preparedConfig)).toThrow(
      [
        'Generated path is empty or invalid: "films.".',
        `  Origin: ${normalizeSourceFile(
          fixturePath('generate-basic', 'src/graphql/films.ts'),
        )}#FeaturedFilmsDocument`,
      ].join('\n'),
    );
  });

  it('reuses import names and sorts import groups', () => {
    const preparedConfig = createConfig();
    const modulePlan = planGeneratedModule(
      [
        createGeneratedEntry({
          origin: createGraphQLDocumentOrigin(
            'AdminStatusDocument',
            normalizeSourceFile(
              fixturePath('generate-basic', 'src/graphql/admin-status.ts'),
            ),
          ),
          options: {
            from: '../callsheet-options/zulu',
            name: 'adminOptions',
          },
          callsheetPath: ['adminStatus', 'adminStatus'],
          sourceImport: {
            filePath: fixturePath(
              'generate-basic',
              'src/graphql/admin-status.ts',
            ),
            name: 'AdminStatusDocument',
          },
        }),
        createGeneratedEntry({
          options: {
            from: '../callsheet-options/alpha',
            name: 'sharedOptions',
          },
          callsheetPath: ['films', 'featuredFilms'],
        }),
        createGeneratedEntry({
          origin: createGraphQLDocumentOrigin(
            'FilmByIdDocument',
            normalizeSourceFile(
              fixturePath('generate-basic', 'src/graphql/films.ts'),
            ),
          ),
          options: {
            from: '../callsheet-options/alpha',
            name: 'sharedOptions',
          },
          callsheetPath: ['films', 'filmById'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/films.ts'),
            name: 'FilmByIdDocument',
          },
        }),
      ],
      preparedConfig,
    );

    expect(renderModuleSource(preparedConfig, modulePlan))
      .toMatchInlineSnapshot(`
      "import { defineCalls, query } from '@callsheet/react-query';
      import { AdminStatusDocument } from '../graphql/admin-status';
      import { FeaturedFilmsDocument, FilmByIdDocument } from '../graphql/films';
      import { sharedOptions } from '../callsheet-options/alpha';
      import { adminOptions } from '../callsheet-options/zulu';

      export const calls = defineCalls({
        "adminStatus": {
          "adminStatus": query(AdminStatusDocument, adminOptions),
        },
        "films": {
          "featuredFilms": query(FeaturedFilmsDocument, sharedOptions),
          "filmById": query(FilmByIdDocument, sharedOptions),
        },
      } as const);
      "
    `);
  });

  it('adds ./ when generated imports stay under the output directory', () => {
    const preparedConfig = prepareGenerationConfig({
      adapter: 'react-query',
      outputFile: fixturePath('generate-basic', 'src/generated/calls.ts'),
      sources: {
        graphql: [],
      },
    });
    const modulePlan = planGeneratedModule(
      [
        createGeneratedEntry({
          callsheetPath: ['films', 'featuredFilms'],
          sourceImport: {
            filePath: fixturePath(
              'generate-basic',
              'src/generated/graphql/films.ts',
            ),
            name: 'FeaturedFilmsDocument',
          },
        }),
      ],
      preparedConfig,
    );

    expect(renderModuleSource(preparedConfig, modulePlan)).toContain(
      `import { FeaturedFilmsDocument } from './graphql/films';`,
    );
  });

  it('aliases colliding import names from different modules', () => {
    const preparedConfig = createConfig();
    const modulePlan = planGeneratedModule(
      [
        createGeneratedEntry({
          origin: createGraphQLDocumentOrigin(
            'StatusDocument',
            normalizeSourceFile(
              fixturePath('generate-basic', 'src/graphql/admin.ts'),
            ),
          ),
          callsheetPath: ['admin', 'status'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/admin.ts'),
            name: 'StatusDocument',
          },
        }),
        createGeneratedEntry({
          origin: createGraphQLDocumentOrigin(
            'StatusDocument',
            normalizeSourceFile(
              fixturePath('generate-basic', 'src/graphql/system.ts'),
            ),
          ),
          callsheetPath: ['system', 'status'],
          sourceImport: {
            filePath: fixturePath('generate-basic', 'src/graphql/system.ts'),
            name: 'StatusDocument',
          },
        }),
      ],
      preparedConfig,
    );
    const code = renderModuleSource(preparedConfig, modulePlan);

    expect(code).toContain(
      `import { StatusDocument } from '../graphql/admin';`,
    );
    expect(code).toContain(
      `import { StatusDocument as StatusDocument_2 } from '../graphql/system';`,
    );
    expect(code).toContain(`query(StatusDocument),`);
    expect(code).toContain(`query(StatusDocument_2),`);
  });

  it('renders a call from a contract entry path', () => {
    const preparedConfig = createConfig();
    const modulePlan = planGeneratedModule(
      [createTsRestGeneratedEntry(['users', 'byId'])],
      preparedConfig,
    );

    expect(renderModuleSource(preparedConfig, modulePlan))
      .toMatchInlineSnapshot(`
      "import { defineCalls, query } from '@callsheet/react-query';
      import { contract } from '../rest/contract';

      export const calls = defineCalls({
        "rest": {
          "users": {
            "byId": query(contract.users.byId),
          },
        },
      } as const);
      "
    `);
  });

  it('uses bracket access when a contract key is not a valid identifier', () => {
    const preparedConfig = createConfig();
    const modulePlan = planGeneratedModule(
      [createTsRestGeneratedEntry(['users', 'by-id'])],
      preparedConfig,
    );

    expect(renderModuleSource(preparedConfig, modulePlan)).toContain(
      `query(contract.users["by-id"])`,
    );
  });
});
