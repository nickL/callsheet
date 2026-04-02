// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig, unstable_serialize } from 'swr';

import { defineCalls, query } from '../../src';
import {
  buildSWRKey,
  usePreload,
  useQuery,
  useSWRQuery,
  withSWRConfig,
} from '../../src/swr';

import type { TypedDocumentLike } from '../../src';
import type {
  ExecuteCall,
  ExecuteCallContext,
  ExecuteCallMiddleware,
} from '../../src/swr';
import type { PropsWithChildren } from 'react';
import type { Middleware, SWRConfiguration } from 'swr';

interface FilmByIdOutput {
  film: {
    id: string;
    title: string;
  };
}

interface FeaturedFilmsOutput {
  films: readonly string[];
}

const generatedFeaturedDocument: TypedDocumentLike<
  FeaturedFilmsOutput,
  Record<string, never>
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
    },
  ],
};

const calls = defineCalls({
  films: {
    byId: query<{ id: string }, FilmByIdOutput>(),
    featured: query(generatedFeaturedDocument),
  },
});

const noInputCalls = defineCalls({
  films: {
    featured: query<void, FeaturedFilmsOutput>(),
  },
});

const fallbackData = {
  film: {
    id: 'fallback',
    title: 'Wall-E fallback',
  },
} as const;

function createWrapper(
  execute: ExecuteCall,
  middleware: readonly ExecuteCallMiddleware[] = [],
  config: Omit<SWRConfiguration, 'provider'> = {},
) {
  const cache = new Map();

  const Wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig(
        {
          ...config,
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
  return createWrapper(execute, [], {
    fallback: {
      [unstable_serialize(key)]: data,
    },
  });
}

function createExecuteSpy() {
  const execute = vi.fn(
    (context: ExecuteCallContext<typeof calls.films.byId>) => {
      if (context.call === calls.films.byId) {
        return Promise.resolve({
          film: {
            id: context.input.id,
            title: 'Wall-E',
          },
        });
      }

      return Promise.resolve({
        films: ['Wall-E', 'Inside Out'],
      });
    },
  ) as ExecuteCall;

  return {
    execute,
  };
}

describe('swr adapter', () => {
  it('fetches a manual query through useQuery', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          input: { id: 'film_123' },
        }),
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

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('fetches a generated query through useQuery', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(() => useQuery(calls.films.featured), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        films: ['Wall-E', 'Inside Out'],
      });
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('supports the useSWRQuery alias', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(
      () =>
        useSWRQuery(calls.films.byId, {
          input: { id: 'film_123' },
        }),
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

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('supports preload of required-input query with usePreload', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);
    const preloadHook = renderHook(() => usePreload(calls.films.byId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await preloadHook.result.current({ id: 'film_123' });
    });

    expect(execute).toHaveBeenCalledTimes(1);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          input: { id: 'film_123' },
        }),
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

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('supports preload of no-input query with usePreload', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);
    const preloadHook = renderHook(
      () => usePreload(noInputCalls.films.featured),
      {
        wrapper: Wrapper,
      },
    );

    await act(async () => {
      await preloadHook.result.current();
    });

    expect(execute).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useQuery(noInputCalls.films.featured), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        films: ['Wall-E', 'Inside Out'],
      });
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('preserves local SWR query options with useQuery', () => {
    const execute = vi.fn(() =>
      Promise.resolve({
        film: {
          id: 'film_123',
          title: 'Wall-E',
        },
      }),
    ) as ExecuteCall;
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          input: { id: 'film_123' },
          fallbackData,
          revalidateOnMount: false,
        }),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.data).toEqual(fallbackData);
    expect(execute).not.toHaveBeenCalled();
  });

  it('allows enabled=false behavior with useQuery', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        enabled
          ? useQuery(calls.films.byId, {
              enabled: true,
              input: { id: 'film_123' },
            })
          : useQuery(calls.films.byId, {
              enabled: false,
            }),
      {
        initialProps: { enabled: false },
        wrapper: Wrapper,
      },
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(execute).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        film: {
          id: 'film_123',
          title: 'Wall-E',
        },
      });
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('allows isPaused behavior with useQuery', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          input: { id: 'film_123' },
          isPaused: () => true,
          revalidateOnMount: true,
        }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  });

  it('allows SWR middleware with useQuery', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);
    const logger = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const loggerMiddleware: Middleware =
      (useSWRNext) => (key, fetcher, config) => {
        logger(key);
        return useSWRNext(key, fetcher, config);
      };

    const expectedKey = buildSWRKey(calls.films.byId, { id: 'film_123' }, true);
    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          input: { id: 'film_123' },
          use: [loggerMiddleware],
        }),
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

    expect(logger).toHaveBeenCalledWith(expectedKey);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when SWR middleware rewrites query keys', async () => {
    const { execute } = createExecuteSpy();
    const { Wrapper } = createWrapper(execute);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rewrittenKey = ['rewritten', 'wall-e'] as const;
    const rewritingMiddleware: Middleware =
      (useSWRNext) => (_key, fetcher, config) =>
        useSWRNext(rewrittenKey, fetcher, config);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          input: { id: 'film_123' },
          use: [rewritingMiddleware],
        }),
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

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('rewrote this query key'),
    );
  });

  it('does not execute disabled queries when SWR middleware rewrites query keys', async () => {
    const execute = vi.fn(() => {
      throw new Error('disabled queries should not execute');
    }) as ExecuteCall;
    const { Wrapper } = createWrapper(execute);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rewrittenKey = ['rewritten', 'wall-e'] as const;
    const rewritingMiddleware: Middleware =
      (useSWRNext) => (_key, fetcher, config) =>
        useSWRNext(rewrittenKey, fetcher, config);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          enabled: false,
          use: [rewritingMiddleware],
        }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('rewrote this query key'),
      );
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('preserves enabled=false behavior with inherited SWR fetchers', async () => {
    const execute = vi.fn(() => {
      throw new Error('disabled queries should not execute');
    }) as ExecuteCall;
    const globalFetcher = vi.fn(() =>
      Promise.resolve({
        film: {
          id: 'film_123',
          title: 'Wall-E global fetcher',
        },
      }),
    );
    const { Wrapper } = createWrapper(execute, [], {
      fetcher: globalFetcher,
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rewrittenKey = ['rewritten', 'wall-e'] as const;
    const rewritingMiddleware: Middleware =
      (useSWRNext) => (_key, fetcher, config) =>
        useSWRNext(rewrittenKey, fetcher, config);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          enabled: false,
          use: [rewritingMiddleware],
        }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('rewrote this query key'),
      );
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(globalFetcher).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('allows execute middleware with useQuery', async () => {
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.byId>) =>
        Promise.resolve({
          film: {
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
    const { Wrapper } = createWrapper(execute, [executeMiddleware]);

    const { result } = renderHook(
      () =>
        useQuery(calls.films.byId, {
          input: { id: 'film_123' },
        }),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        film: {
          id: 'film_123',
          title: unstable_serialize(
            buildSWRKey(calls.films.byId, { id: 'film_123' }, true),
          ),
        },
      });
    });
  });

  it('supports execute middleware with usePreload', async () => {
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.byId>) =>
        Promise.resolve({
          film: {
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
    const { Wrapper } = createWrapper(execute, [executeMiddleware]);
    const preloadHook = renderHook(() => usePreload(calls.films.byId), {
      wrapper: Wrapper,
    });

    let output: FilmByIdOutput | undefined;

    await act(async () => {
      output = await preloadHook.result.current({ id: 'film_preload_exec' });
    });

    expect(output).toEqual({
      film: {
        id: 'film_preload_exec',
        title: unstable_serialize(
          buildSWRKey(calls.films.byId, { id: 'film_preload_exec' }, true),
        ),
      },
    });
  });

  it('uses the innermost adapter with usePreload', async () => {
    const outerExecute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.byId>) =>
        Promise.resolve({
          film: {
            id: context.input.id,
            title: 'Wall-E outer',
          },
        }),
    ) as ExecuteCall;
    const innerExecute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.byId>) =>
        Promise.resolve({
          film: {
            id: context.input.id,
            title: 'Wall-E inner',
          },
        }),
    ) as ExecuteCall;
    const outerCache = new Map();
    const innerCache = new Map();
    const Wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig
        value={withSWRConfig(
          { provider: () => outerCache },
          { execute: outerExecute },
        )}
      >
        <SWRConfig
          value={withSWRConfig(
            { provider: () => innerCache },
            { execute: innerExecute },
          )}
        >
          {children}
        </SWRConfig>
      </SWRConfig>
    );
    const preloadHook = renderHook(() => usePreload(calls.films.byId), {
      wrapper: Wrapper,
    });

    let output: FilmByIdOutput | undefined;

    await act(async () => {
      output = await preloadHook.result.current({ id: 'film_preload_nested' });
    });

    expect(output).toEqual({
      film: {
        id: 'film_preload_nested',
        title: 'Wall-E inner',
      },
    });
    expect(innerExecute).toHaveBeenCalledTimes(1);
    expect(outerExecute).not.toHaveBeenCalled();
  });

  it('applies call-defined query defaults', () => {
    const defaultedById = Object.assign(
      query<{ id: string }, FilmByIdOutput>(),
      {
        revalidateOnMount: false,
      },
    );
    const defaultedCalls = defineCalls({
      films: {
        byId: defaultedById,
      },
    });
    const execute = vi.fn(() =>
      Promise.resolve({
        film: {
          id: 'film_123',
          title: 'Wall-E',
        },
      }),
    ) as ExecuteCall;
    const key = buildSWRKey(
      defaultedCalls.films.byId,
      { id: 'film_123' },
      true,
    );
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      ...fallbackData,
    });

    const { result } = renderHook(
      () =>
        useQuery(defaultedCalls.films.byId, {
          input: { id: 'film_123' },
        }),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.data).toEqual({
      ...fallbackData,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('lets local query options override call-defined query defaults', async () => {
    const defaultedById = Object.assign(
      query<{ id: string }, FilmByIdOutput>(),
      {
        revalidateOnMount: false,
      },
    );
    const defaultedCalls = defineCalls({
      films: {
        byId: defaultedById,
      },
    });
    const execute = vi.fn(() =>
      Promise.resolve({
        film: {
          id: 'film_123',
          title: 'Wall-E',
        },
      }),
    ) as ExecuteCall;
    const key = buildSWRKey(
      defaultedCalls.films.byId,
      { id: 'film_123' },
      true,
    );
    const { Wrapper } = createWrapperWithFallback(execute, key, {
      ...fallbackData,
    });

    const { result } = renderHook(
      () =>
        useQuery(defaultedCalls.films.byId, {
          input: { id: 'film_123' },
          revalidateOnMount: true,
        }),
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

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
