// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  CALL_KINDS,
  call,
  defineCalls,
  mutation,
  query,
  useMutation,
  usePreload,
  useQuery,
  useSWRMutation,
  useSWRPreload,
  useSWRQuery,
} from '../src/index';

import type { CallsheetCustomSource, TypedDocumentLike } from '../src/index';

interface FilmByIdOutput {
  film: {
    id: string;
    title: string;
  };
}

interface UpdateFilmOutput {
  film: {
    id: string;
    title: string;
  };
}

const updateFilmSource: CallsheetCustomSource<
  { id: string; title: string },
  UpdateFilmOutput,
  typeof CALL_KINDS.mutation
> & { sourceId: 'films.update' } = {
  callsheetKind: CALL_KINDS.mutation,
  sourceId: 'films.update',
};

const filmByIdSource: CallsheetCustomSource<
  { id: string },
  FilmByIdOutput,
  typeof CALL_KINDS.query
> & { sourceId: 'films.byId' } = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.byId',
};

const featuredFilmsDocument: TypedDocumentLike<
  { films: readonly string[] },
  Record<string, never>
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
    },
  ],
};

describe('@callsheet/swr runtime surface', () => {
  it('exports canonical hooks with secondary SWR aliases', () => {
    expect(useQuery).toBe(useSWRQuery);
    expect(useMutation).toBe(useSWRMutation);
    expect(usePreload).toBe(useSWRPreload);
  });

  it('builds custom source and GraphQL calls with definition defaults', () => {
    const calls = defineCalls({
      films: {
        byId: call(filmByIdSource, {
          family: ['films', 'detail'] as const,
          revalidateOnFocus: false,
          refreshInterval: 30_000,
        }),
        featured: query(featuredFilmsDocument, {
          family: ['films', 'list'] as const,
          revalidateOnMount: false,
          refreshWhenHidden: true,
        }),
        update: mutation(updateFilmSource, {
          family: ['films', 'detail'] as const,
          populateCache: true,
          revalidate: false,
        }),
      },
    });

    expect(calls.films.byId.kind).toBe(CALL_KINDS.query);
    expect(calls.films.featured.kind).toBe(CALL_KINDS.query);
    expect(calls.films.update.kind).toBe(CALL_KINDS.mutation);
    expect(calls.films.byId.source).toBe(filmByIdSource);
    expect(calls.films.featured.source).toBe(featuredFilmsDocument);
    expect(calls.films.update.source).toBe(updateFilmSource);
    expect(calls.films.byId.revalidateOnFocus).toBe(false);
    expect(calls.films.byId.refreshInterval).toBe(30_000);
    expect(calls.films.featured.revalidateOnMount).toBe(false);
    expect(calls.films.featured.refreshWhenHidden).toBe(true);
    expect(calls.films.update.populateCache).toBe(true);
    expect(calls.films.update.revalidate).toBe(false);
  });
});
