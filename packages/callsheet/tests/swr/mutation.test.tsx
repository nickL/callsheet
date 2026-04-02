// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig, unstable_serialize } from 'swr';

import { defineCalls, mutation, query } from '../../src';
import {
  buildSWRKey,
  useMutation,
  useQuery,
  useSWRMutation,
  withSWRConfig,
} from '../../src/swr';

import type { TypedDocumentLike } from '../../src';
import type {
  ExecuteCall,
  ExecuteCallContext,
  ExecuteCallMiddleware,
} from '../../src/swr';
import type { PropsWithChildren } from 'react';
import type { Middleware } from 'swr';

interface UpdateFilmOutput {
  updatedFilm: {
    id: string;
    title: string;
  };
}

interface RefreshFilmOutput {
  refreshed: true;
}

interface SharedFilmOutput {
  film: {
    id: string;
    title: string;
  };
}

const generatedRefreshDocument: TypedDocumentLike<
  RefreshFilmOutput,
  Record<string, never>
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
    },
  ],
};

const generatedRenameDocument: TypedDocumentLike<
  SharedFilmOutput,
  { id: string; title: string }
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
    },
  ],
};

const sharedFilmKey = ['films', 'shared'] as const;

const calls = defineCalls({
  films: {
    update: mutation<{ id: string; title: string }, UpdateFilmOutput>(),
    refresh: mutation(generatedRefreshDocument),
    detail: query<{ id: string }, SharedFilmOutput>({
      family: ['films', 'detail'],
      key: ({ input }) => ['films', 'detail', input.id],
    }),
    rename: mutation<{ id: string; title: string }, SharedFilmOutput>({
      family: ['films', 'detail'],
      key: ({ input }) => ['films', 'detail', input.id],
    }),
    cached: query<void, SharedFilmOutput>({
      family: ['films', 'shared'],
      key: sharedFilmKey,
    }),
    sync: mutation<{ id: string; title: string }, SharedFilmOutput>({
      family: ['films', 'shared'],
      key: sharedFilmKey,
    }),
  },
});

const invalidationCalls = defineCalls({
  films: {
    detail: calls.films.detail,
    rename: mutation<{ id: string; title: string }, SharedFilmOutput>({
      family: ['films', 'detail'],
      invalidates: [['films', 'detail']] as const,
      key: ({ input }) => ['films', 'detail', input.id],
    }),
  },
});

const callbackInvalidationCalls = defineCalls({
  films: {
    detail: calls.films.detail,
    rename: mutation<{ id: string; title: string }, SharedFilmOutput>({
      family: ['films', 'detail'],
      invalidates: ({ input, output }) =>
        [
          ['films', 'detail'],
          ['films', 'renamed'],
          ['films', 'renamed', input.id, output.film.title],
        ] as const,
      key: ({ input }) => ['films', 'detail', input.id],
    }),
    renamed: query<{ id: string; title: string }, SharedFilmOutput>({
      family: ['films', 'renamed'],
      key: ({ input }) => ['films', 'renamed', input.id, input.title],
    }),
  },
});

const prefixInvalidationCalls = defineCalls({
  films: {
    detail: callbackInvalidationCalls.films.detail,
    renamed: callbackInvalidationCalls.films.renamed,
    rename: mutation<{ id: string; title: string }, SharedFilmOutput>({
      family: ['films', 'detail'],
      invalidates: [['films']] as const,
      key: ({ input }) => ['films', 'detail', input.id],
    }),
  },
});

const mixedSourceInvalidationCalls = defineCalls({
  films: {
    detail: calls.films.detail,
    rename: mutation(generatedRenameDocument, {
      family: ['films', 'detail'],
      invalidates: [['films', 'detail']] as const,
      key: ({ input }) => ['films', 'detail', input.id],
    }),
  },
});

const undefinedOutputCalls = defineCalls({
  films: {
    detail: calls.films.detail,
    clear: mutation<{ id: string }, undefined>({
      family: ['films', 'detail'],
      invalidates: [['films', 'detail']] as const,
      key: ({ input }) => ['films', 'detail', input.id],
    }),
  },
});

const mutationWithoutInvalidationCall = mutation<
  { id: string; title: string },
  SharedFilmOutput
>({
  family: ['films', 'detail'],
  key: ({ input }) => ['films', 'detail', input.id],
});

function createDeferred<TValue>() {
  let resolve!: (value: TValue) => void;

  const promise = new Promise<TValue>((innerResolve) => {
    resolve = innerResolve;
  });

  return {
    promise,
    resolve,
  };
}

function createWrapper(execute: ExecuteCall) {
  const cache = new Map();

  const Wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig(
        {
          provider: () => cache,
        },
        {
          execute,
        },
      )}
    >
      {children}
    </SWRConfig>
  );

  return { Wrapper };
}

function createWrapperWithMiddleware(
  execute: ExecuteCall,
  middleware: readonly Middleware[],
) {
  const cache = new Map();

  const Wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig(
        {
          provider: () => cache,
          use: [...middleware],
        },
        {
          execute,
        },
      )}
    >
      {children}
    </SWRConfig>
  );

  return { Wrapper };
}

function createWrapperWithExecuteMiddleware(
  execute: ExecuteCall,
  middleware: readonly ExecuteCallMiddleware[],
) {
  const cache = new Map();

  const Wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig(
        {
          provider: () => cache,
        },
        {
          execute,
          middleware,
        },
      )}
    >
      {children}
    </SWRConfig>
  );

  return { Wrapper };
}

function createWrapperWithFallback(
  execute: ExecuteCall,
  key: readonly unknown[],
  data: unknown,
) {
  return createWrapperWithFallbacks(execute, [[key, data]]);
}

function createWrapperWithFallbacks(
  execute: ExecuteCall,
  entries: readonly (readonly [readonly unknown[], unknown])[],
) {
  const cache = new Map();
  const fallback = Object.fromEntries(
    entries.map(([entryKey, entryData]) => [
      unstable_serialize(entryKey),
      entryData,
    ]),
  );

  const Wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig(
        {
          fallback,
          provider: () => cache,
        },
        {
          execute,
        },
      )}
    >
      {children}
    </SWRConfig>
  );

  return { Wrapper };
}

function createNestedWrappers(
  outerExecute: ExecuteCall,
  innerExecute: ExecuteCall,
  entries: {
    outer: readonly (readonly [readonly unknown[], unknown])[];
    inner: readonly (readonly [readonly unknown[], unknown])[];
  },
) {
  const outerCache = new Map();
  const innerCache = new Map();
  const outerFallback = Object.fromEntries(
    entries.outer.map(([entryKey, entryData]) => [
      unstable_serialize(entryKey),
      entryData,
    ]),
  );
  const innerFallback = Object.fromEntries(
    entries.inner.map(([entryKey, entryData]) => [
      unstable_serialize(entryKey),
      entryData,
    ]),
  );

  const OuterWrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig(
        {
          fallback: outerFallback,
          provider: () => outerCache,
        },
        {
          execute: outerExecute,
        },
      )}
    >
      {children}
    </SWRConfig>
  );

  const InnerWrapper = ({ children }: PropsWithChildren) => (
    <OuterWrapper>
      <SWRConfig
        value={withSWRConfig(
          {
            fallback: innerFallback,
            provider: () => innerCache,
          },
          {
            execute: innerExecute,
          },
        )}
      >
        {children}
      </SWRConfig>
    </OuterWrapper>
  );

  return {
    InnerWrapper,
    OuterWrapper,
    innerCache,
    outerCache,
  };
}

describe('swr adapter', () => {
  it('allows manual mutation through useMutation hook', async () => {
    const deferred = createDeferred<UpdateFilmOutput>();
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.update>) => {
        expect(context.input).toEqual({
          id: 'film_123',
          title: 'Inside Out',
        });

        return deferred.promise;
      },
    ) as ExecuteCall;
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(() => useMutation(calls.films.update), {
      wrapper: Wrapper,
    });

    expect(result.current.isMutating).toBe(false);

    let triggerPromise!: Promise<UpdateFilmOutput>;

    act(() => {
      triggerPromise = result.current.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.isMutating).toBe(true);
    });

    await act(async () => {
      deferred.resolve({
        updatedFilm: {
          id: 'film_123',
          title: 'Inside Out',
        },
      });
      await triggerPromise;
    });

    expect(result.current.data).toEqual({
      updatedFilm: {
        id: 'film_123',
        title: 'Inside Out',
      },
    });
    expect(result.current.isMutating).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('allows generated mutation through useMutation hook', async () => {
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.refresh>) => {
        expect(context.call).toBe(calls.films.refresh);

        return Promise.resolve({
          refreshed: true,
        });
      },
    ) as ExecuteCall;
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(() => useMutation(calls.films.refresh), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.data).toEqual({
      refreshed: true,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('supports the useSWRMutation alias', async () => {
    const execute = vi.fn(() =>
      Promise.resolve({
        refreshed: true,
      }),
    ) as ExecuteCall;
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(() => useSWRMutation(calls.films.refresh), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.data).toEqual({
      refreshed: true,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('allows SWR middleware with useMutation', async () => {
    const execute = vi.fn(() =>
      Promise.resolve({
        refreshed: true,
      }),
    ) as ExecuteCall;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const passThroughMiddleware: Middleware =
      (useSWRNext) => (key, fetcher, config) =>
        useSWRNext(key, fetcher, config);
    const { Wrapper } = createWrapperWithMiddleware(execute, [
      passThroughMiddleware,
    ]);

    const { result } = renderHook(() => useMutation(calls.films.refresh), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.data).toEqual({
      refreshed: true,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when SWR middleware rewrites mutation keys', async () => {
    const execute = vi.fn(() =>
      Promise.resolve({
        refreshed: true,
      }),
    ) as ExecuteCall;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rewrittenKey = ['rewritten', 'wall-e'] as const;
    const rewritingMiddleware: Middleware =
      (useSWRNext) => (_key, fetcher, config) =>
        useSWRNext(rewrittenKey, fetcher, config);
    const { Wrapper } = createWrapperWithMiddleware(execute, [
      rewritingMiddleware,
    ]);

    const { result } = renderHook(() => useMutation(calls.films.refresh), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.data).toEqual({
      refreshed: true,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('rewrote this mutation key'),
    );
  });

  it('allows execute middleware with useMutation', async () => {
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.update>) =>
        Promise.resolve({
          updatedFilm: {
            id: context.input.id,
            title: context.execution?.transportKey as string,
          },
        }),
    ) as ExecuteCall;
    const executeMiddleware: ExecuteCallMiddleware = async (context, next) =>
      next({
        execution: {
          transportKey: unstable_serialize(context.key),
        },
      });
    const { Wrapper } = createWrapperWithExecuteMiddleware(execute, [
      executeMiddleware,
    ]);

    const { result } = renderHook(() => useMutation(calls.films.update), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    expect(result.current.data).toEqual({
      updatedFilm: {
        id: 'film_123',
        title: unstable_serialize(
          buildSWRKey(
            calls.films.update,
            {
              id: 'film_123',
              title: 'Inside Out',
            },
            false,
          ),
        ),
      },
    });
  });

  it('allows mutation input and keeps keys stable', async () => {
    const contexts: ExecuteCallContext<typeof calls.films.update>[] = [];
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.update>) => {
        contexts.push(context);

        return Promise.resolve({
          updatedFilm: {
            id: context.input.id,
            title: context.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(() => useMutation(calls.films.update), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
      await result.current.trigger({
        id: 'film_456',
        title: 'Wall-E',
      });
    });

    expect(contexts).toHaveLength(2);
    expect(contexts[0]?.input).toEqual({
      id: 'film_123',
      title: 'Inside Out',
    });
    expect(contexts[1]?.input).toEqual({
      id: 'film_456',
      title: 'Wall-E',
    });
    expect(contexts[0]?.key).toEqual(contexts[1]?.key);
  });

  it('preserves mutation options and keeps local mutation state', async () => {
    const onSuccess = vi.fn();
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.sync>) =>
        Promise.resolve({
          film: {
            id: context.input.id,
            title: context.input.title,
          },
        }),
    ) as ExecuteCall;
    const key = buildSWRKey(calls.films.cached, undefined, false);
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'fallback',
        title: 'Wall-E fallback',
      },
    });

    const { result: queryResult } = renderHook(
      () =>
        useQuery(calls.films.cached, {
          revalidateOnMount: false,
        }),
      {
        wrapper: Wrapper,
      },
    );
    const { result: mutationResult } = renderHook(
      () =>
        useMutation(calls.films.sync, {
          onSuccess,
          revalidate: false,
        }),
      {
        wrapper: Wrapper,
      },
    );

    expect(queryResult.current.data).toEqual({
      film: {
        id: 'fallback',
        title: 'Wall-E fallback',
      },
    });

    await act(async () => {
      await mutationResult.current.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    expect(mutationResult.current.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Inside Out',
      },
    });
    expect(queryResult.current.data).toEqual({
      film: {
        id: 'fallback',
        title: 'Wall-E fallback',
      },
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('skips invalidation when a mutation is reset before success', async () => {
    const deferred = createDeferred<SharedFilmOutput>();
    const onSuccess = vi.fn();
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof invalidationCalls.films.detail>
          | ExecuteCallContext<typeof invalidationCalls.films.rename>,
      ) => {
        if (context.call === invalidationCalls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched',
            },
          });
        }

        return deferred.promise;
      },
    ) as ExecuteCall;
    const key = buildSWRKey(invalidationCalls.films.detail, { id: 'film_123' });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(invalidationCalls.films.rename, {
          onSuccess,
        }),
        query: useQuery(invalidationCalls.films.detail, {
          input: {
            id: 'film_123',
          },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    let triggerPromise!: Promise<SharedFilmOutput>;

    act(() => {
      triggerPromise = result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.mutation.isMutating).toBe(true);
    });

    act(() => {
      result.current.mutation.reset();
    });

    await act(async () => {
      deferred.resolve({
        film: {
          id: 'film_123',
          title: 'Inside Out',
        },
      });
      await triggerPromise;
    });

    expect(result.current.mutation.data).toBeUndefined();
    expect(result.current.query.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('applies call-defined mutation defaults and lets local overrides win', async () => {
    const defaultedSync = Object.assign(
      mutation<{ id: string; title: string }, SharedFilmOutput>({
        family: ['films', 'shared'],
        key: sharedFilmKey,
      }),
      {
        populateCache: true,
        revalidate: false,
      },
    );
    const defaultedCalls = defineCalls({
      films: {
        cached: calls.films.cached,
        sync: defaultedSync,
      },
    });
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof defaultedCalls.films.sync>) =>
        Promise.resolve({
          film: {
            id: context.input.id,
            title: context.input.title,
          },
        }),
    ) as ExecuteCall;
    const key = buildSWRKey(defaultedCalls.films.cached, undefined, false);
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'fallback',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(defaultedCalls.films.sync),
        overriddenMutation: useMutation(defaultedCalls.films.sync, {
          populateCache: false,
        }),
        query: useQuery(defaultedCalls.films.cached, {
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Inside Out',
        },
      });
    });

    await act(async () => {
      await result.current.overriddenMutation.trigger({
        id: 'film_456',
        title: 'Wall-E',
      });
    });

    expect(result.current.query.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Inside Out',
      },
    });
  });

  it('invalidates matching queries after a successful mutation', async () => {
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof invalidationCalls.films.detail>
          | ExecuteCallContext<typeof invalidationCalls.films.rename>,
      ) => {
        if (context.call === invalidationCalls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched',
            },
          });
        }

        const mutationContext = context as ExecuteCallContext<
          typeof invalidationCalls.films.rename
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const key = buildSWRKey(invalidationCalls.films.detail, { id: 'film_123' });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(invalidationCalls.films.rename, {
          populateCache: false,
          revalidate: false,
        }),
        query: useQuery(invalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched',
        },
      });
    });

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('invalidates matching queries when a mutation resolves undefined', async () => {
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof undefinedOutputCalls.films.detail>
          | ExecuteCallContext<typeof undefinedOutputCalls.films.clear>,
      ) => {
        if (context.call === undefinedOutputCalls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched',
            },
          });
        }

        return Promise.resolve(undefined);
      },
    ) as ExecuteCall;
    const key = buildSWRKey(undefinedOutputCalls.films.detail, {
      id: 'film_123',
    });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(undefinedOutputCalls.films.clear, {
          revalidate: false,
        }),
        query: useQuery(undefinedOutputCalls.films.detail, {
          input: {
            id: 'film_123',
          },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
      });
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched',
        },
      });
    });

    expect(result.current.mutation.data).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('resolves invalidation families from invalidates callbacks', async () => {
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof callbackInvalidationCalls.films.detail>
          | ExecuteCallContext<typeof callbackInvalidationCalls.films.rename>
          | ExecuteCallContext<typeof callbackInvalidationCalls.films.renamed>,
      ) => {
        if (context.call === callbackInvalidationCalls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched detail',
            },
          });
        }

        if (context.call === callbackInvalidationCalls.films.renamed) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched renamed',
            },
          });
        }

        const mutationContext = context as ExecuteCallContext<
          typeof callbackInvalidationCalls.films.rename
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const detailKey = buildSWRKey(callbackInvalidationCalls.films.detail, {
      id: 'film_123',
    });
    const renamedKey = buildSWRKey(callbackInvalidationCalls.films.renamed, {
      id: 'film_123',
      title: 'Inside Out',
    });
    const { Wrapper } = createWrapperWithFallbacks(execute, [
      [
        detailKey,
        {
          film: {
            id: 'film_123',
            title: 'Wall-E fallback detail',
          },
        },
      ],
      [
        renamedKey,
        {
          film: {
            id: 'film_123',
            title: 'Wall-E fallback renamed',
          },
        },
      ],
    ]);

    const { result } = renderHook(
      () => ({
        mutation: useMutation(callbackInvalidationCalls.films.rename, {
          populateCache: false,
          revalidate: false,
        }),
        detail: useQuery(callbackInvalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
        renamed: useQuery(callbackInvalidationCalls.films.renamed, {
          input: { id: 'film_123', title: 'Inside Out' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.detail.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched detail',
        },
      });
      expect(result.current.renamed.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched renamed',
        },
      });
    });
  });

  it('invalidates matching families by prefix', async () => {
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof prefixInvalidationCalls.films.detail>
          | ExecuteCallContext<typeof prefixInvalidationCalls.films.rename>
          | ExecuteCallContext<typeof prefixInvalidationCalls.films.renamed>,
      ) => {
        if (context.call === prefixInvalidationCalls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched detail',
            },
          });
        }

        if (context.call === prefixInvalidationCalls.films.renamed) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched renamed',
            },
          });
        }

        const mutationContext = context as ExecuteCallContext<
          typeof prefixInvalidationCalls.films.rename
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const detailKey = buildSWRKey(prefixInvalidationCalls.films.detail, {
      id: 'film_123',
    });
    const renamedKey = buildSWRKey(prefixInvalidationCalls.films.renamed, {
      id: 'film_123',
      title: 'Inside Out',
    });
    const { Wrapper } = createWrapperWithFallbacks(execute, [
      [
        detailKey,
        {
          film: {
            id: 'film_123',
            title: 'Wall-E fallback detail',
          },
        },
      ],
      [
        renamedKey,
        {
          film: {
            id: 'film_123',
            title: 'Wall-E fallback renamed',
          },
        },
      ],
    ]);

    const { result } = renderHook(
      () => ({
        mutation: useMutation(prefixInvalidationCalls.films.rename, {
          populateCache: false,
          revalidate: false,
        }),
        detail: useQuery(prefixInvalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
        renamed: useQuery(prefixInvalidationCalls.films.renamed, {
          input: { id: 'film_123', title: 'Inside Out' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.detail.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched detail',
        },
      });
      expect(result.current.renamed.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched renamed',
        },
      });
    });
  });

  it('invalidates mixed source queries after a successful mutation', async () => {
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof mixedSourceInvalidationCalls.films.detail>
          | ExecuteCallContext<
              typeof mixedSourceInvalidationCalls.films.rename
            >,
      ) => {
        if (context.call === mixedSourceInvalidationCalls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched mixed source',
            },
          });
        }

        const mutationContext = context as ExecuteCallContext<
          typeof mixedSourceInvalidationCalls.films.rename
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const key = buildSWRKey(mixedSourceInvalidationCalls.films.detail, {
      id: 'film_123',
    });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(mixedSourceInvalidationCalls.films.rename, {
          populateCache: false,
          revalidate: false,
        }),
        query: useQuery(mixedSourceInvalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched mixed source',
        },
      });
    });
  });

  it('skips invalidation when a mutation call does not declare invalidates', async () => {
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof calls.films.detail>
          | ExecuteCallContext<typeof mutationWithoutInvalidationCall>,
      ) => {
        if (context.call === calls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched',
            },
          });
        }

        const mutationContext = context as ExecuteCallContext<
          typeof mutationWithoutInvalidationCall
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const key = buildSWRKey(calls.films.detail, { id: 'film_123' });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(mutationWithoutInvalidationCall, {
          populateCache: false,
          revalidate: false,
        }),
        query: useQuery(calls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    expect(result.current.query.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('ensures mutation onSuccess is called before invalidation', async () => {
    const order: string[] = [];
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof invalidationCalls.films.detail>
          | ExecuteCallContext<typeof invalidationCalls.films.rename>,
      ) => {
        if (context.call === invalidationCalls.films.detail) {
          order.push('invalidate');

          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched',
            },
          });
        }

        const mutationContext = context as ExecuteCallContext<
          typeof invalidationCalls.films.rename
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const onSuccess = vi.fn(() => {
      order.push('user');
    });
    const key = buildSWRKey(invalidationCalls.films.detail, { id: 'film_123' });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(invalidationCalls.films.rename, {
          onSuccess,
          populateCache: false,
          revalidate: false,
        }),
        query: useQuery(invalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(order.indexOf('user')).toBeLessThan(order.indexOf('invalidate'));
  });

  it('ensures mutation onSuccess runs when invalidation fails', async () => {
    const onSuccess = vi.fn();
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof invalidationCalls.films.detail>
          | ExecuteCallContext<typeof invalidationCalls.films.rename>,
      ) => {
        if (context.call === invalidationCalls.films.detail) {
          return Promise.reject(new Error('invalidate failed'));
        }

        const mutationContext = context as ExecuteCallContext<
          typeof invalidationCalls.films.rename
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const key = buildSWRKey(invalidationCalls.films.detail, { id: 'film_123' });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(invalidationCalls.films.rename, {
          onSuccess,
          populateCache: false,
          revalidate: false,
        }),
        query: useQuery(invalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.query.error).toEqual(
        new Error('invalidate failed'),
      );
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('invalidates queries in the active provider scope only', async () => {
    const key = buildSWRKey(invalidationCalls.films.detail, { id: 'film_123' });
    const outerExecute = vi.fn(
      (context: ExecuteCallContext<typeof invalidationCalls.films.detail>) =>
        Promise.resolve({
          film: {
            id: context.input.id,
            title: 'Wall-E outer refetched',
          },
        }),
    ) as ExecuteCall;
    const innerExecute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof invalidationCalls.films.detail>
          | ExecuteCallContext<typeof invalidationCalls.films.rename>,
      ) => {
        if (context.call === invalidationCalls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E inner refetched',
            },
          });
        }

        const mutationContext = context as ExecuteCallContext<
          typeof invalidationCalls.films.rename
        >;

        return Promise.resolve({
          film: {
            id: mutationContext.input.id,
            title: mutationContext.input.title,
          },
        });
      },
    ) as ExecuteCall;
    const { InnerWrapper, OuterWrapper } = createNestedWrappers(
      outerExecute,
      innerExecute,
      {
        outer: [
          [
            key,
            {
              film: {
                id: 'film_123',
                title: 'Wall-E outer fallback',
              },
            },
          ],
        ],
        inner: [
          [
            key,
            {
              film: {
                id: 'film_123',
                title: 'Wall-E inner fallback',
              },
            },
          ],
        ],
      },
    );

    const { result: outerResult } = renderHook(
      () =>
        useQuery(invalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      {
        wrapper: OuterWrapper,
      },
    );
    const { result: innerResult } = renderHook(
      () => ({
        mutation: useMutation(invalidationCalls.films.rename, {
          populateCache: false,
          revalidate: false,
        }),
        query: useQuery(invalidationCalls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: InnerWrapper,
      },
    );

    expect(outerResult.current.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Wall-E outer fallback',
      },
    });
    expect(innerResult.current.query.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Wall-E inner fallback',
      },
    });

    await act(async () => {
      await innerResult.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(innerResult.current.query.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E inner refetched',
        },
      });
    });

    expect(outerResult.current.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Wall-E outer fallback',
      },
    });
    expect(outerExecute).not.toHaveBeenCalled();
  });

  it('allows keys derived from functions for populateCache', async () => {
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.rename>) =>
        Promise.resolve({
          film: {
            id: context.input.id,
            title: context.input.title,
          },
        }),
    ) as ExecuteCall;
    const key = buildSWRKey(calls.films.detail, { id: 'film_123' });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result: queryResult } = renderHook(
      () =>
        useQuery(calls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      {
        wrapper: Wrapper,
      },
    );
    const { result: mutationResult } = renderHook(
      () =>
        useMutation(calls.films.rename, {
          populateCache: true,
          revalidate: false,
        }),
      {
        wrapper: Wrapper,
      },
    );

    expect(queryResult.current.data).toEqual({
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    await act(async () => {
      await mutationResult.current.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(queryResult.current.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Inside Out',
        },
      });
    });
  });

  it('allows keys derived from functions for revalidate', async () => {
    const execute = vi.fn(
      (
        context:
          | ExecuteCallContext<typeof calls.films.detail>
          | ExecuteCallContext<typeof calls.films.rename>,
      ) => {
        if (context.call === calls.films.detail) {
          return Promise.resolve({
            film: {
              id: context.input.id,
              title: 'Wall-E refetched',
            },
          });
        }

        return Promise.resolve({
          film: {
            id: context.input.id,
            title: 'Inside Out',
          },
        });
      },
    ) as ExecuteCall;
    const key = buildSWRKey(calls.films.detail, { id: 'film_123' });
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    });

    const { result } = renderHook(
      () => ({
        mutation: useMutation(calls.films.rename, {
          populateCache: false,
          revalidate: true,
        }),
        query: useQuery(calls.films.detail, {
          input: { id: 'film_123' },
          revalidateOnMount: false,
        }),
      }),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await result.current.mutation.trigger({
        id: 'film_123',
        title: 'Inside Out',
      });
    });

    await waitFor(() => {
      expect(result.current.query.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E refetched',
        },
      });
    });

    expect(execute).toHaveBeenCalledTimes(2);
  });
});
