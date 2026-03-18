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
  DiscoveredGraphQLDocument,
  GeneratedCallOverride,
} from '../../src/types';

function createConfig(overrides: readonly GeneratedCallOverride[] = []) {
  return prepareGenerationConfig({
    discovery: {
      entries: [],
      rootDir: '.',
      tsconfigFile: './tsconfig.json',
    },
    outputFile: fixturePath('generate-basic', 'src/generated/calls.ts'),
    overrides,
  });
}

function createDocument(
  partial: Partial<DiscoveredGraphQLDocument> &
    Pick<DiscoveredGraphQLDocument, 'exportName' | 'path' | 'sourceFile'>,
): DiscoveredGraphQLDocument {
  return {
    ...partial,
  };
}

describe('generate unit', () => {
  it('matches overrides after normalizing source file paths', () => {
    const sourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/film-by-id.ts'),
    );
    const preparedConfig = createConfig([
      {
        match: {
          sourceFile: `./${sourceFile}`,
          exportName: 'FilmByIdDocument',
        },
        kind: 'query',
        options: {
          from: '../callsheet-options/films',
          name: 'filmByIdOptions',
        },
        path: ['films', 'byId'],
      },
    ]);

    const result = buildGeneratedEntries(
      [
        createDocument({
          exportName: 'FilmByIdDocument',
          path: ['filmById', 'filmById'],
          sourceFile,
        }),
      ],
      preparedConfig,
    );

    expect(result.entries).toEqual([
      {
        builder: 'query',
        callsheetPath: ['films', 'byId'],
        exportName: 'FilmByIdDocument',
        options: {
          from: '../callsheet-options/films',
          name: 'filmByIdOptions',
        },
        sourceFile,
      },
    ]);
  });

  it('throws when an override does not match a discovered document export', () => {
    const sourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/films.ts'),
    );
    const preparedConfig = createConfig([
      {
        match: {
          sourceFile,
          exportName: 'MissingDocument',
        },
        kind: 'query',
      },
    ]);

    const result = buildGeneratedEntries(
      [
        createDocument({
          exportName: 'FeaturedFilmsDocument',
          kind: 'query',
          path: ['films', 'featuredFilms'],
          sourceFile,
        }),
      ],
      preparedConfig,
    );

    expect(() => validateGeneratedEntries(result, preparedConfig)).toThrow(
      [
        'Some overrides did not match a discovered GraphQL document export.',
        `  ${sourceFile}#MissingDocument`,
      ].join('\n'),
    );
  });

  it('throws when a discovered document kind cannot be inferred and no kind override is provided', () => {
    const sourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/unknown-kind.ts'),
    );

    expect(() =>
      buildGeneratedEntries(
        [
          createDocument({
            exportName: 'FilmByIdDocument',
            path: ['unknownKind', 'filmById'],
            sourceFile,
          }),
        ],
        createConfig(),
      ),
    ).toThrow(
      [
        'Could not tell if this discovered GraphQL document is a query or mutation.',
        `  ${sourceFile}#FilmByIdDocument`,
        'Add an explicit kind override for this document.',
      ].join('\n'),
    );
  });

  it('throws when duplicate overrides match the same discovered document export', () => {
    const sourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/films.ts'),
    );

    expect(() =>
      createConfig([
        {
          match: {
            sourceFile,
            exportName: 'FeaturedFilmsDocument',
          },
          kind: 'query',
        },
        {
          match: {
            sourceFile,
            exportName: 'FeaturedFilmsDocument',
          },
          kind: 'query',
        },
      ]),
    ).toThrow(
      [
        'Two overrides matched the same GraphQL document export.',
        `  ${sourceFile}#FeaturedFilmsDocument`,
      ].join('\n'),
    );
  });

  it('throws on generated path collisions', () => {
    const sourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/films.ts'),
    );
    const preparedConfig = createConfig();
    const result = buildGeneratedEntries(
      [
        createDocument({
          exportName: 'FilmByIdDocument',
          kind: 'query',
          path: ['films', 'filmById'],
          sourceFile,
        }),
        createDocument({
          exportName: 'SharedFilmByIdDocument',
          kind: 'query',
          path: ['films', 'filmById'],
          sourceFile,
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
        createDocument({
          exportName: 'FilmsDocument',
          kind: 'query',
          path: ['films'],
          sourceFile,
        }),
        createDocument({
          exportName: 'FeaturedFilmsDocument',
          kind: 'query',
          path: ['films', 'featured'],
          sourceFile,
        }),
      ],
      preparedConfig,
    );

    expect(() => validateGeneratedEntries(result, preparedConfig)).toThrow(
      'Generated paths conflict: "films" and "films.featured".',
    );
  });

  it('throws when an override creates an empty generated path segment', () => {
    const sourceFile = normalizeSourceFile(
      fixturePath('generate-basic', 'src/graphql/films.ts'),
    );
    const preparedConfig = createConfig();
    const result = buildGeneratedEntries(
      [
        createDocument({
          exportName: 'FeaturedFilmsDocument',
          kind: 'query',
          path: ['films', ''],
          sourceFile,
        }),
      ],
      preparedConfig,
    );

    expect(() => validateGeneratedEntries(result, preparedConfig)).toThrow(
      `Generated path is empty or invalid for ${sourceFile}#FeaturedFilmsDocument.`,
    );
  });

  it('reuses import names and sorts import groups', () => {
    const preparedConfig = createConfig();
    const modulePlan = planGeneratedModule(
      [
        {
          builder: 'query',
          callsheetPath: ['adminStatus', 'adminStatus'],
          exportName: 'AdminStatusDocument',
          options: {
            from: '../callsheet-options/zulu',
            name: 'adminOptions',
          },
          sourceFile: normalizeSourceFile(
            fixturePath('generate-basic', 'src/graphql/admin-status.ts'),
          ),
        },
        {
          builder: 'query',
          callsheetPath: ['films', 'featuredFilms'],
          exportName: 'FeaturedFilmsDocument',
          options: {
            from: '../callsheet-options/alpha',
            name: 'sharedOptions',
          },
          sourceFile: normalizeSourceFile(
            fixturePath('generate-basic', 'src/graphql/films.ts'),
          ),
        },
        {
          builder: 'query',
          callsheetPath: ['films', 'filmById'],
          exportName: 'FilmByIdDocument',
          options: {
            from: '../callsheet-options/alpha',
            name: 'sharedOptions',
          },
          sourceFile: normalizeSourceFile(
            fixturePath('generate-basic', 'src/graphql/films.ts'),
          ),
        },
      ],
      preparedConfig,
    );

    expect(renderModuleSource(preparedConfig, modulePlan))
      .toMatchInlineSnapshot(`
      "import { defineCalls, query } from 'callsheet';
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
      discovery: {
        entries: [],
        rootDir: '.',
        tsconfigFile: './tsconfig.json',
      },
      outputFile: fixturePath('generate-basic', 'src/generated/calls.ts'),
    });
    const modulePlan = planGeneratedModule(
      [
        {
          builder: 'query',
          callsheetPath: ['films', 'featuredFilms'],
          exportName: 'FeaturedFilmsDocument',
          sourceFile: normalizeSourceFile(
            fixturePath('generate-basic', 'src/generated/graphql/films.ts'),
          ),
        },
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
        {
          builder: 'query',
          callsheetPath: ['admin', 'status'],
          exportName: 'StatusDocument',
          sourceFile: normalizeSourceFile(
            fixturePath('generate-basic', 'src/graphql/admin.ts'),
          ),
        },
        {
          builder: 'query',
          callsheetPath: ['system', 'status'],
          exportName: 'StatusDocument',
          sourceFile: normalizeSourceFile(
            fixturePath('generate-basic', 'src/graphql/system.ts'),
          ),
        },
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
});
