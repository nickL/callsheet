// @vitest-environment jsdom

import {
  HydrationBoundary,
  QueryClientProvider,
  dehydrate,
  useMutation as useTanstackMutation,
} from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from './tanstack-test-utils';
import { CALL_KINDS, call, defineCalls } from '../../src';
import {
  CallsheetProvider,
  createReactQueryAdapter,
  queryOptions,
  useMutation,
  useQuery,
} from '../../src/react-query';

import type { CallOutputOf, CallsheetCustomSource } from '../../src';
import type { ExecuteCall, ExecuteCallContext } from '../../src/react-query';
import type { PropsWithChildren } from 'react';

type FeaturedFilmsSource = CallsheetCustomSource<
  void,
  { films: readonly string[] },
  typeof CALL_KINDS.query
> & {
  sourceId: 'films.featured';
};

type FilmByIdSource = CallsheetCustomSource<
  { id: string },
  { film: { id: string; title: string } },
  typeof CALL_KINDS.query
> & {
  sourceId: 'films.byId';
};

type MaybeFilmByIdSource = CallsheetCustomSource<
  { id: string } | undefined,
  { film: { id: string; title: string } },
  typeof CALL_KINDS.query
> & {
  sourceId: 'films.maybeById';
};

type UpdateFilmSource = CallsheetCustomSource<
  { id: string; title: string },
  { updateFilm: { id: string; title: string } },
  typeof CALL_KINDS.mutation
> & {
  sourceId: 'films.update';
};

const featuredFilmsSource: FeaturedFilmsSource = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.featured',
};

const filmByIdSource: FilmByIdSource = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.byId',
};

const maybeFilmByIdSource: MaybeFilmByIdSource = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.maybeById',
};

const updateFilmSource: UpdateFilmSource = {
  callsheetKind: CALL_KINDS.mutation,
  sourceId: 'films.update',
};

const calls = defineCalls({
  films: {
    byId: call(filmByIdSource, {
      dataKey: ({ input }) => ['film', input.id] as const,
    }),
    maybeById: call(maybeFilmByIdSource, {
      dataKey: ({ input }) => ['film', input?.id ?? 'unknown'] as const,
    }),
    featured: call(featuredFilmsSource, {
      dataKey: ['films', 'featured'],
    }),
    update: call(updateFilmSource, {
      invalidates: ({ input }) => [['film', input.id]] as const,
    }),
  },
});

const metadataFallbackCalls = defineCalls({
  films: {
    recent: call(featuredFilmsSource),
  },
});

const unregisteredFeaturedCall = call(featuredFilmsSource);
const updateWithoutInvalidationCall = call(updateFilmSource);

function createExecuteSpy() {
  interface FilmByIdContext {
    call: typeof calls.films.byId;
    input: { id: string };
  }
  interface FeaturedFilmsContext {
    call: typeof calls.films.featured;
    input: void;
  }
  interface MaybeFilmByIdContext {
    call: typeof calls.films.maybeById;
    input: { id: string } | undefined;
  }
  interface UpdateFilmContext {
    call: typeof calls.films.update;
    input: { id: string; title: string };
  }
  type KnownCallContext =
    | FilmByIdContext
    | FeaturedFilmsContext
    | MaybeFilmByIdContext
    | UpdateFilmContext;

  function executeKnownCall(context: KnownCallContext) {
    switch (context.call.source.sourceId) {
      case 'films.byId':
        return Promise.resolve({
          film: {
            id: (context as FilmByIdContext).input.id,
            title: 'Wall-E',
          },
        });
      case 'films.featured':
        return Promise.resolve({
          films: ['Wall-E', 'Inside Out'] as const,
        });
      case 'films.maybeById':
        return Promise.resolve({
          film: {
            id: (context as MaybeFilmByIdContext).input?.id ?? 'unknown',
            title: 'Wall-E',
          },
        });
      case 'films.update':
        return Promise.resolve({
          updateFilm: {
            id: (context as UpdateFilmContext).input.id,
            title: (context as UpdateFilmContext).input.title,
          },
        });
      default:
        return Promise.reject(new Error('Unexpected test call'));
    }
  }

  const executeSpy = vi.fn(executeKnownCall);
  const execute: ExecuteCall = (context) =>
    executeSpy(context as unknown as KnownCallContext) as Promise<
      CallOutputOf<typeof context.call>
    >;

  return {
    execute,
    executeSpy,
  };
}

function createWrapper(
  queryClient = createTestQueryClient(),
  executeState = createExecuteSpy(),
) {
  const adapter = createReactQueryAdapter({
    execute: executeState.execute,
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <CallsheetProvider adapter={adapter}>{children}</CallsheetProvider>
    </QueryClientProvider>
  );

  return {
    adapter,
    execute: executeState.execute,
    executeSpy: executeState.executeSpy,
    queryClient,
    Wrapper,
  };
}

describe('react-query adapter', () => {
  it('builds query config for React Query options', async () => {
    const executeState = createExecuteSpy();
    const adapter = createReactQueryAdapter({
      execute: executeState.execute,
    });
    const queryClient = createTestQueryClient();

    const featuredConfig = queryOptions(calls.films.featured, {
      staleTime: 5_000,
    });
    const byIdConfig = queryOptions(calls.films.byId, {
      input: { id: 'film_123' },
    });

    expect('queryKey' in featuredConfig).toBe(false);
    expect('queryFn' in byIdConfig).toBe(false);

    const featuredOptions = adapter.resolveQueryOptions(featuredConfig);
    const byIdOptions = adapter.resolveQueryOptions(byIdConfig);

    expect(featuredOptions.queryKey).toEqual([
      'callsheet',
      'films',
      'featured',
    ]);
    expect(byIdOptions.queryKey).toEqual([
      'callsheet',
      'film',
      'film_123',
      { input: { id: 'film_123' } },
    ]);

    await expect(
      adapter.fetchQuery(queryClient, featuredConfig),
    ).resolves.toEqual({
      films: ['Wall-E', 'Inside Out'],
    });
    await expect(adapter.fetchQuery(queryClient, byIdConfig)).resolves.toEqual({
      film: {
        id: 'film_123',
        title: 'Wall-E',
      },
    });
    expect(executeState.executeSpy).toHaveBeenCalledTimes(2);
  });

  it('ensures explicit undefined input remains in the query key', () => {
    const { adapter } = createWrapper();
    const maybeByIdConfig = queryOptions(calls.films.maybeById, {
      input: undefined,
    });

    expect(adapter.resolveQueryOptions(maybeByIdConfig).queryKey).toEqual([
      'callsheet',
      'film',
      'unknown',
      { input: undefined },
    ]);
  });

  it('falls back to the call path when no dataKey is defined', () => {
    const { adapter } = createWrapper();
    const recentConfig = queryOptions(metadataFallbackCalls.films.recent);

    expect(adapter.resolveQueryOptions(recentConfig).queryKey).toEqual([
      'callsheet',
      'films',
      'recent',
    ]);
  });

  it('throws when a query is missing dataKey and defineCalls metadata', () => {
    const { adapter } = createWrapper();
    const unregisteredConfig = queryOptions(unregisteredFeaturedCall);

    expect(() => adapter.resolveQueryOptions(unregisteredConfig)).toThrow(
      'Unable to build a React Query key. Define `dataKey` on the call or register the call with defineCalls(...).',
    );
  });

  it('passes React Query query context through to execute', async () => {
    const executeState = createExecuteSpy();
    const adapter = createReactQueryAdapter({
      execute: executeState.execute,
    });
    const queryClient = createTestQueryClient();
    const config = queryOptions(calls.films.byId, {
      input: { id: 'film_123' },
      meta: { source: 'test' },
    });

    await adapter.fetchQuery(queryClient, config);

    const executeContext = executeState.executeSpy.mock
      .calls[0]?.[0] as ExecuteCallContext<typeof calls.films.byId>;
    const reactQuery = executeContext.reactQuery;

    expect(reactQuery).toBeDefined();
    expect(reactQuery && 'queryKey' in reactQuery).toBe(true);
    if (!reactQuery || !('queryKey' in reactQuery)) {
      throw new Error('Expected query context');
    }
    expect(reactQuery.meta).toEqual({ source: 'test' });
    expect(reactQuery.queryKey).toEqual(
      adapter.resolveQueryOptions(config).queryKey,
    );
    expect(reactQuery.signal).toBeInstanceOf(AbortSignal);
  });

  it('preserves React Query enabled=false behavior', () => {
    const { Wrapper, executeSpy } = createWrapper();
    const { result } = renderHook(
      () =>
        useQuery(
          queryOptions(calls.films.byId, {
            input: { id: 'film_123' },
            enabled: false,
          }),
        ),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('ensures select behavior is preserved with useQuery', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useQuery(
          queryOptions(calls.films.byId, {
            input: { id: 'film_123' },
            select: (data) => data.film.title,
          }),
        ),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('Wall-E');
    });
  });

  it('throws when useQuery is called without CallsheetProvider', () => {
    expect(() => {
      renderHook(() =>
        useQuery(
          queryOptions(calls.films.byId, {
            input: { id: 'film_123' },
          }),
        ),
      );
    }).toThrow(
      'Wrap your tree in <CallsheetProvider> to use Callsheet React Query hooks.',
    );
  });

  it('invalidates matching queries after a successful mutation', async () => {
    const { Wrapper, adapter, queryClient } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await adapter.prefetchQuery(
      queryClient,
      queryOptions(calls.films.byId, {
        input: { id: 'film_123' },
      }),
    );

    const { result } = renderHook(() => useMutation(calls.films.update), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      id: 'film_123',
      title: 'Inside Out',
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['callsheet', 'film', 'film_123'],
    });
  });

  it('invalidates matching queries through adapter.mutationOptions', async () => {
    const { Wrapper, adapter, queryClient } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await adapter.prefetchQuery(
      queryClient,
      queryOptions(calls.films.byId, {
        input: { id: 'film_123' },
      }),
    );

    const { result } = renderHook(
      () => useTanstackMutation(adapter.mutationOptions(calls.films.update)),
      {
        wrapper: Wrapper,
      },
    );

    await result.current.mutateAsync({
      id: 'film_123',
      title: 'Inside Out',
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['callsheet', 'film', 'film_123'],
    });
  });

  it('skips invalidation when a mutation call does not declare invalidates', async () => {
    const { Wrapper, adapter, queryClient } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useTanstackMutation(
          adapter.mutationOptions(updateWithoutInvalidationCall),
        ),
      {
        wrapper: Wrapper,
      },
    );

    await result.current.mutateAsync({
      id: 'film_123',
      title: 'Inside Out',
    });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('ensures mutation onSuccess is called before invalidation', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const order: string[] = [];
    const originalInvalidateQueries =
      queryClient.invalidateQueries.bind(queryClient);

    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation((...args) => {
      order.push('invalidate');
      return originalInvalidateQueries(...args);
    });

    const onSuccess = vi.fn(() => {
      order.push('user');
    });

    const { result } = renderHook(
      () =>
        useMutation(calls.films.update, {
          onSuccess,
        }),
      {
        wrapper: Wrapper,
      },
    );

    await result.current.mutateAsync({
      id: 'film_123',
      title: 'Inside Out',
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(
      {
        updateFilm: {
          id: 'film_123',
          title: 'Inside Out',
        },
      },
      {
        id: 'film_123',
        title: 'Inside Out',
      },
      undefined,
      expect.any(Object),
    );
    expect(order.indexOf('user')).toBeLessThan(order.indexOf('invalidate'));
  });

  it('passes React Query mutation context through to execute', async () => {
    const { Wrapper, executeSpy } = createWrapper();
    const { result } = renderHook(
      () =>
        useMutation(calls.films.update, {
          mutationKey: ['films', 'update'],
          meta: { source: 'test' },
        }),
      {
        wrapper: Wrapper,
      },
    );

    await result.current.mutateAsync({
      id: 'film_123',
      title: 'Inside Out',
    });

    const executeContext = executeSpy.mock.calls[0]?.[0] as ExecuteCallContext<
      typeof calls.films.update
    >;
    const reactQuery = executeContext.reactQuery;

    expect(reactQuery).toBeDefined();
    expect(reactQuery && 'mutationKey' in reactQuery).toBe(true);
    if (!reactQuery || !('mutationKey' in reactQuery)) {
      throw new Error('Expected mutation context');
    }
    expect(reactQuery).toMatchObject({
      meta: { source: 'test' },
      mutationKey: ['films', 'update'],
    });
  });

  it('throws when useMutation is called without CallsheetProvider', () => {
    expect(() => {
      renderHook(() => useMutation(calls.films.update));
    }).toThrow(
      'Wrap your tree in <CallsheetProvider> to use Callsheet React Query hooks.',
    );
  });

  it('ensures mutation onSuccess runs when invalidation fails', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const onSuccess = vi.fn();

    vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(
      new Error('invalidate failed'),
    );

    const { result } = renderHook(
      () =>
        useMutation(calls.films.update, {
          onSuccess,
        }),
      {
        wrapper: Wrapper,
      },
    );

    await expect(
      result.current.mutateAsync({
        id: 'film_123',
        title: 'Inside Out',
      }),
    ).rejects.toThrow('invalidate failed');

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('supports prefetching and hydration through queryOptions', async () => {
    const executeState = createExecuteSpy();
    const adapter = createReactQueryAdapter({
      execute: executeState.execute,
    });
    const serverQueryClient = createTestQueryClient();

    await adapter.prefetchQuery(
      serverQueryClient,
      queryOptions(calls.films.byId, {
        input: { id: 'film_123' },
      }),
    );

    const dehydratedState = dehydrate(serverQueryClient);
    const clientQueryClient = createTestQueryClient();
    const Wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={clientQueryClient}>
        <CallsheetProvider adapter={adapter}>
          <HydrationBoundary state={dehydratedState}>
            {children}
          </HydrationBoundary>
        </CallsheetProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useQuery(
          queryOptions(calls.films.byId, {
            input: { id: 'film_123' },
            staleTime: Infinity,
          }),
        ),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E',
        },
      });
    });
    expect(executeState.executeSpy).toHaveBeenCalledTimes(1);
  });
});
