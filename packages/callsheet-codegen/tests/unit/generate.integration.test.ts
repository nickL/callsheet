import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupTempFixtures,
  copyFixtureToTemp,
  fixturePath,
} from './test-helpers';
import { generateCallsheetModule, writeCallsheetModule } from '../../src';

afterEach(cleanupTempFixtures);

describe('generate integration', { timeout: 15_000 }, () => {
  const fixture = 'generate-basic';

  it('generates a Callsheet module with overrides and imported options', async () => {
    const result = await generateCallsheetModule({
      sources: {
        graphql: [
          {
            entries: ['films.ts'],
            rootDir: fixturePath(fixture, 'src/graphql'),
            tsconfigFile: fixturePath(fixture, 'tsconfig.json'),
          },
        ],
      },
      outputFile: fixturePath(fixture, 'src/generated/calls.ts'),
      overrides: [
        {
          path: ['films', 'filmById'],
          as: ['films', 'byId'],
          kind: 'query',
          options: {
            from: '../callsheet-options/films',
            name: 'filmByIdOptions',
          },
        },
      ],
    });

    expect(result.entries.map((entry) => entry.path.join('.'))).toEqual([
      'films.byId',
      'films.featuredFilms',
    ]);
    expect(result.code).toMatchInlineSnapshot(`
      "import { defineCalls, query } from 'callsheet';
      import { FeaturedFilmsDocument, FilmByIdDocument } from '../graphql/films';
      import { filmByIdOptions } from '../callsheet-options/films';

      export const calls = defineCalls({
        "films": {
          "byId": query(FilmByIdDocument, filmByIdOptions),
          "featuredFilms": query(FeaturedFilmsDocument),
        },
      } as const);
      "
    `);
  });

  it('generates mutation builders when document is inferred as mutation', async () => {
    const result = await generateCallsheetModule({
      sources: {
        graphql: [
          {
            entries: ['update.ts'],
            rootDir: fixturePath(fixture, 'src/graphql'),
            tsconfigFile: fixturePath(fixture, 'tsconfig.json'),
          },
        ],
      },
      outputFile: fixturePath(fixture, 'src/generated/calls.ts'),
    });

    expect(result.code).toContain(
      `import { defineCalls, mutation } from 'callsheet';`,
    );
    expect(result.code).toContain(
      `"updateFilm": mutation(UpdateFilmDocument),`,
    );
  });

  it('writes the generated Callsheet module to disk', async () => {
    const tempRoot = await copyFixtureToTemp(fixture);

    const result = await writeCallsheetModule({
      sources: {
        graphql: [
          {
            entries: ['status.ts'],
            rootDir: path.join(tempRoot, 'src/graphql'),
            tsconfigFile: path.join(tempRoot, 'tsconfig.json'),
          },
        ],
      },
      outputFile: path.join(tempRoot, 'src/generated/calls.ts'),
    });

    await expect(fs.readFile(result.outputFile, 'utf8')).resolves.toBe(
      result.code,
    );
  });

  it('throws when discovery finds no GraphQL document exports', async () => {
    await expect(
      generateCallsheetModule({
        sources: {
          graphql: [
            {
              entries: ['empty.ts'],
              rootDir: fixturePath(fixture, 'src/graphql'),
              tsconfigFile: fixturePath(fixture, 'tsconfig.json'),
            },
          ],
        },
        outputFile: fixturePath(fixture, 'src/generated/calls.ts'),
      }),
    ).rejects.toThrow(
      'No Callsheet source entries were discovered for the provided Callsheet codegen config.',
    );
  });
});
