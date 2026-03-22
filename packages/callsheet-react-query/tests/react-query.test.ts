import { QueryClient } from '@tanstack/react-query';
import { initContract } from '@ts-rest/core';
import { describe, expect, it, vi } from 'vitest';

import {
  CALL_KINDS,
  call,
  createReactQueryAdapter,
  defineCalls,
  mutation,
  query,
  queryOptions,
} from '../src/index';

import type {
  CallsheetCustomSource,
  ExecuteCall,
  TypedDocumentLike,
} from '../src/index';

const c = initContract();

const contract = c.router({
  films: {
    byId: c.query({
      method: 'GET',
      path: '/films/:id',
      pathParams: c.type<{ id: string }>(),
      responses: {
        200: c.type<{ film: { id: string; title: string } }>(),
      },
    }),
    update: c.mutation({
      body: c.type<{ id: string; title: string }>(),
      method: 'PATCH',
      path: '/films/:id',
      pathParams: c.type<{ id: string }>(),
      responses: {
        200: c.type<{ updated: true }>(),
      },
    }),
  },
});

const filmByIdSource: CallsheetCustomSource<
  { id: string },
  { film: { id: string; title: string } },
  typeof CALL_KINDS.query
> & { sourceId: 'films.byId' } = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.byId',
};

const updateFilmSource: CallsheetCustomSource<
  { id: string; title: string },
  { updateFilm: { id: string; title: string } },
  typeof CALL_KINDS.mutation
> & { sourceId: 'films.update' } = {
  callsheetKind: CALL_KINDS.mutation,
  sourceId: 'films.update',
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

function createExecuteStub(): ExecuteCall {
  return vi.fn(async () => {
    throw new Error('execute should not be called in this test');
  });
}

describe('@callsheet/react-query runtime surface', () => {
  it('builds custom source and GraphQL calls', () => {
    const onError = vi.fn();

    const calls = defineCalls({
      films: {
        byId: call(filmByIdSource, {
          family: ['films', 'detail'] as const,
          retry: 1,
          staleTime: 30_000,
        }),
        featured: query(featuredFilmsDocument, {
          family: ['films', 'list'] as const,
          queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
          staleTime: 60_000,
        }),
        update: mutation(updateFilmSource, {
          invalidates: [['films', 'detail']] as const,
          onError,
          retry: 2,
        }),
      },
    });

    expect(calls.films.byId.kind).toBe(CALL_KINDS.query);
    expect(calls.films.featured.kind).toBe(CALL_KINDS.query);
    expect(calls.films.update.kind).toBe(CALL_KINDS.mutation);
    expect(calls.films.byId.source).toBe(filmByIdSource);
    expect(calls.films.featured.source).toBe(featuredFilmsDocument);
    expect(calls.films.update.source).toBe(updateFilmSource);
    expect(calls.films.byId.staleTime).toBe(30_000);
    expect(calls.films.featured.staleTime).toBe(60_000);
    expect(calls.films.update.retry).toBe(2);
    expect(calls.films.update.onError).toBe(onError);
  });

  it('supports ts-rest routes', () => {
    const byId = query(contract.films.byId, {
      family: ['films', 'detail'] as const,
      staleTime: 30_000,
    });
    const update = mutation(contract.films.update, {
      invalidates: [['films', 'detail']] as const,
      retry: 1,
    });

    expect(byId.kind).toBe(CALL_KINDS.query);
    expect(update.kind).toBe(CALL_KINDS.mutation);
    expect(byId.source).toBe(contract.films.byId);
    expect(update.source).toBe(contract.films.update);
    expect(byId.staleTime).toBe(30_000);
    expect(update.retry).toBe(1);
  });

  it('merges query definition objects with support for local overrides', () => {
    const queryKeyHashFn = vi.fn((queryKey: readonly unknown[]) =>
      JSON.stringify(queryKey),
    );
    const filmByIdCall = query(filmByIdSource, {
      family: ['films', 'detail'] as const,
      queryKeyHashFn,
      retry: 2,
      staleTime: 30_000,
      throwOnError: true,
    });

    const adapter = createReactQueryAdapter({
      execute: createExecuteStub(),
    });

    const resolved = adapter.resolveQueryOptions(
      queryOptions(filmByIdCall, {
        input: { id: 'wall-e' },
        retry: 1,
      }),
    );

    expect(resolved.queryKeyHashFn).toBe(queryKeyHashFn);
    expect(resolved.retry).toBe(1);
    expect(resolved.staleTime).toBe(30_000);
    expect(resolved.throwOnError).toBe(true);
  });

  it('passes React Query mutation scope through definition defaults', () => {
    const updateCall = mutation(updateFilmSource, {
      invalidates: [['films', 'detail']] as const,
      scope: {
        id: 'films.update',
      },
    });

    const adapter = createReactQueryAdapter({
      execute: createExecuteStub(),
    });

    const resolved = adapter.mutationOptions(updateCall);

    expect(resolved.scope).toEqual({
      id: 'films.update',
    });
  });

  it('local onSuccess ordering works with call definitions', async () => {
    const order: string[] = [];
    const onError = vi.fn();
    const updateCall = mutation(updateFilmSource, {
      invalidates: [['films', 'detail']] as const,
      onError,
      retry: 2,
    });

    const adapter = createReactQueryAdapter({
      execute: createExecuteStub(),
    });

    const resolved = adapter.mutationOptions(updateCall, {
      onSuccess: async () => {
        order.push('local');
      },
      retry: 1,
    });

    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(async () => {
        order.push('invalidate');
        return undefined as never;
      });

    await resolved.onSuccess?.(
      {
        updateFilm: {
          id: 'wall-e',
          title: 'Wall-E',
        },
      },
      {
        id: 'wall-e',
        title: 'Wall-E',
      },
      undefined,
      { client: queryClient } as never,
    );

    expect(order).toEqual(['local', 'invalidate']);
    expect(resolved.onError).toBe(onError);
    expect(resolved.retry).toBe(1);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });
});
