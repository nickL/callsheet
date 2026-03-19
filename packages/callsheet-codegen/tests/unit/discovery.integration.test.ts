import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupTempFixtures,
  fixturePath,
  normalizeSourceFile,
} from './test-helpers';
import { discoverGraphQLDocuments } from '../../src';

afterEach(cleanupTempFixtures);

describe('discovery integration', { timeout: 15_000 }, () => {
  const basicFixture = 'discovery-basic';

  it('discovers document exports from explicit entry modules', async () => {
    const discovered = await discoverGraphQLDocuments({
      entries: ['admin/index.ts', 'index.ts', 'films.ts'],
      rootDir: fixturePath(basicFixture, 'src/graphql'),
      tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
    });

    expect(discovered).toEqual([
      {
        exportName: 'AdminFilmByIdDocument',
        kind: 'query',
        path: ['admin', 'adminFilmById'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/admin/index.ts'),
        ),
      },
      {
        exportName: 'FeaturedFilmsDocument',
        kind: 'query',
        path: ['films', 'featuredFilms'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/films.ts'),
        ),
      },
      {
        exportName: 'HiddenDocument',
        kind: 'query',
        path: ['films', 'hidden'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/films.ts'),
        ),
      },
      {
        exportName: 'SharedFilmByIdDocument',
        kind: 'query',
        path: ['films', 'sharedFilmById'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/films.ts'),
        ),
      },
      {
        exportName: 'SharedFilmsDocument',
        kind: 'query',
        path: ['sharedFilms'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/index.ts'),
        ),
      },
    ]);
  });

  it('dedupes discovered exports', async () => {
    const discoveryInput = {
      entries: ['featured.ts'],
      rootDir: fixturePath(basicFixture, 'src/graphql'),
      tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
    } as const;

    const discovered = await discoverGraphQLDocuments([
      discoveryInput,
      discoveryInput,
    ]);

    expect(discovered).toEqual([
      {
        exportName: 'FeaturedFilmsDocument',
        kind: 'query',
        path: ['featured', 'featuredFilms'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/featured.ts'),
        ),
      },
    ]);
  }, 30_000);

  it('supports tsconfig project references during discovery', async () => {
    const discovered = await discoverGraphQLDocuments({
      entries: ['films.ts'],
      rootDir: fixturePath('discovery-project-references', 'src/graphql'),
      tsconfigFile: fixturePath(
        'discovery-project-references',
        'tsconfig.json',
      ),
    });

    expect(discovered).toEqual([
      {
        exportName: 'FeaturedFilmsDocument',
        kind: 'query',
        path: ['films', 'featuredFilms'],
        sourceFile: normalizeSourceFile(
          fixturePath('discovery-project-references', 'src/graphql/films.ts'),
        ),
      },
    ]);
  });

  it('throws when exportSuffix is empty', async () => {
    await expect(
      discoverGraphQLDocuments({
        entries: ['films.ts'],
        exportSuffix: '',
        rootDir: fixturePath(basicFixture, 'src/graphql'),
        tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
      }),
    ).rejects.toThrow('Callsheet codegen exportSuffix cannot be empty.');
  });

  it('throws when the tsconfig file cannot be read', async () => {
    await expect(
      discoverGraphQLDocuments({
        entries: ['films.ts'],
        rootDir: fixturePath(basicFixture, 'src/graphql'),
        tsconfigFile: fixturePath(basicFixture, 'missing-tsconfig.json'),
      }),
    ).rejects.toThrow(
      `Cannot read file '${fixturePath(basicFixture, 'missing-tsconfig.json')}'.`,
    );
  });

  it('throws when the same document is discovered from multiple entry modules', async () => {
    await expect(
      discoverGraphQLDocuments({
        entries: ['index.ts', 'shared.ts'],
        rootDir: fixturePath(basicFixture, 'src/graphql'),
        tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
      }),
    ).rejects.toThrow(
      [
        'The same GraphQL document export was discovered from multiple entry modules.',
        `  First: ${normalizeSourceFile(fixturePath(basicFixture, 'src/graphql/index.ts'))}#SharedFilmsDocument`,
        `  Second: ${normalizeSourceFile(fixturePath(basicFixture, 'src/graphql/shared.ts'))}#SharedFilmsDocument`,
      ].join('\n'),
    );
  });

  it('throws when wrapper entry modules point at the same document', async () => {
    await expect(
      discoverGraphQLDocuments({
        entries: [
          'duplicate-reexported-documents.ts',
          'reexported-documents.ts',
        ],
        rootDir: fixturePath(basicFixture, 'src/graphql'),
        tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
      }),
    ).rejects.toThrow(
      [
        'The same GraphQL document export was discovered from multiple entry modules.',
        `  First: ${normalizeSourceFile(fixturePath(basicFixture, 'src/graphql/duplicate-reexported-documents.ts'))}#DuplicateFeaturedFilmsDocument`,
        `  Second: ${normalizeSourceFile(fixturePath(basicFixture, 'src/graphql/reexported-documents.ts'))}#ImportedFeaturedFilmsDocument`,
      ].join('\n'),
    );
  });

  it('throws when an entry file is not included in the tsconfig project', async () => {
    await expect(
      discoverGraphQLDocuments({
        entries: ['films.ts'],
        rootDir: fixturePath('discovery-not-in-project', 'src/graphql'),
        tsconfigFile: fixturePath('discovery-not-in-project', 'tsconfig.json'),
      }),
    ).rejects.toThrow(
      [
        'The configured codegen entry was not found in the provided project.',
        `  Entry: ${normalizeSourceFile(fixturePath('discovery-not-in-project', 'src/graphql/films.ts'))}`,
        `  Tsconfig: ${normalizeSourceFile(fixturePath('discovery-not-in-project', 'tsconfig.json'))}`,
      ].join('\n'),
    );
  });

  it('ignores entry modules that have no exports', async () => {
    const discovered = await discoverGraphQLDocuments({
      entries: ['empty.ts'],
      rootDir: fixturePath(basicFixture, 'src/graphql'),
      tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
    });

    expect(discovered).toEqual([]);
  });

  it("ignores non-document or non-value exports that end with 'Document'", async () => {
    const discovered = await discoverGraphQLDocuments({
      entries: ['non-docs.ts'],
      rootDir: fixturePath(basicFixture, 'src/graphql'),
      tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
    });

    expect(discovered.map((entry) => entry.exportName)).toEqual([
      'FeaturedFilmsDocument',
      'HiddenDocument',
    ]);
  });

  it('reads GraphQL properties written as string literals', async () => {
    const discovered = await discoverGraphQLDocuments({
      entries: ['film-by-id.ts'],
      rootDir: fixturePath(basicFixture, 'src/graphql'),
      tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
    });

    expect(discovered).toEqual([
      {
        exportName: 'FeaturedFilmDocument',
        kind: 'query',
        path: ['filmById', 'featuredFilm'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/film-by-id.ts'),
        ),
      },
    ]);
  });

  it('query and mutation kinds can be inferred from re-exported documents', async () => {
    const discovered = await discoverGraphQLDocuments({
      entries: ['reexported-documents.ts'],
      rootDir: fixturePath(basicFixture, 'src/graphql'),
      tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
    });

    expect(discovered).toEqual([
      {
        exportName: 'ImportedFeaturedFilmsDocument',
        kind: 'query',
        path: ['reexportedDocuments', 'importedFeaturedFilms'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/reexported-documents.ts'),
        ),
      },
      {
        exportName: 'ImportedRefreshFilmsDocument',
        kind: 'mutation',
        path: ['reexportedDocuments', 'importedRefreshFilms'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/reexported-documents.ts'),
        ),
      },
    ]);
  });

  it('keeps discovered documents when definitions cannot be read', async () => {
    const discovered = await discoverGraphQLDocuments({
      entries: ['unreadable-definitions.ts'],
      rootDir: fixturePath(basicFixture, 'src/graphql'),
      tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
    });

    expect(discovered).toEqual([
      {
        exportName: 'FragmentLikeDocument',
        path: ['unreadableDefinitions', 'fragmentLike'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/unreadable-definitions.ts'),
        ),
      },
      {
        exportName: 'InvalidDefinitionsDocument',
        path: ['unreadableDefinitions', 'invalidDefinitions'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/unreadable-definitions.ts'),
        ),
      },
      {
        exportName: 'MissingOperationDocument',
        path: ['unreadableDefinitions', 'missingOperation'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/unreadable-definitions.ts'),
        ),
      },
      {
        exportName: 'NumericDefinitionDocument',
        path: ['unreadableDefinitions', 'numericDefinition'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/unreadable-definitions.ts'),
        ),
      },
      {
        exportName: 'ReferencedDocument',
        kind: 'query',
        path: ['unreadableDefinitions', 'referenced'],
        sourceFile: normalizeSourceFile(
          fixturePath(basicFixture, 'src/graphql/unreadable-definitions.ts'),
        ),
      },
    ]);
  });

  it('throws when a discovered document is a subscription', async () => {
    await expect(
      discoverGraphQLDocuments({
        entries: ['subscription.ts'],
        rootDir: fixturePath(basicFixture, 'src/graphql'),
        tsconfigFile: fixturePath(basicFixture, 'tsconfig.json'),
      }),
    ).rejects.toThrow(
      'Subscriptions are not supported yet: FilmUpdatesDocument',
    );
  });
});
