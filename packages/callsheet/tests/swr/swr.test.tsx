// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { SWRConfig, useSWRConfig } from 'swr';

import { defineCalls, query } from '../../src';
import {
  buildSWRKey,
  extractFamilyFromSWRKey,
  extractIdentityFromSWRKey,
  getSWRAdapterConfig,
  isSWRCallKey,
  matchesFamilyInSWRKey,
  useSWRAdapterConfig,
  withSWRConfig,
} from '../../src/swr';

import type { ExecuteCall } from '../../src/swr';
import type { PropsWithChildren } from 'react';
import type { Cache } from 'swr';

function createWrapper() {
  const outerCache = new Map();
  const innerCache = new Map();
  const outerExecute = vi.fn(() =>
    Promise.resolve({ source: 'outer' } as never),
  ) as ExecuteCall;
  const innerExecute = vi.fn(() =>
    Promise.resolve({ source: 'inner' } as never),
  ) as ExecuteCall;

  const Wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig(
        { provider: () => outerCache },
        {
          execute: outerExecute,
        },
      )}
    >
      <SWRConfig
        value={withSWRConfig(
          { provider: () => innerCache },
          {
            execute: innerExecute,
          },
        )}
      >
        {children}
      </SWRConfig>
    </SWRConfig>
  );

  return {
    Wrapper,
    innerCache,
    innerExecute,
    outerCache,
    outerExecute,
  };
}

describe('swr adapter', () => {
  const calls = defineCalls({
    films: {
      byId: query<{ id: string }>(),
    },
  });

  it('builds query keys with input identity', () => {
    const key = buildSWRKey(calls.films.byId, { id: 'film_123' });

    expect(isSWRCallKey(key)).toBe(true);
    expect(key).toEqual([
      'callsheet',
      ['films', 'byId'],
      [['input', { id: 'film_123' }]],
    ]);
  });

  it('uses custom key overrides while preserving family visibility', () => {
    const callsWithKey = defineCalls({
      films: {
        bySlug: query<{ slug: string }>({
          key: ({ input }: { input: { slug: string } }) =>
            ['film', input.slug] as const,
        }),
      },
    });

    const key = buildSWRKey(callsWithKey.films.bySlug, { slug: 'wall-e' });

    expect(extractFamilyFromSWRKey(key)).toEqual(['films', 'bySlug']);
    expect(extractIdentityFromSWRKey(key)).toEqual([
      ['key', ['film', 'wall-e']],
    ]);
    expect(key[2]).toEqual([['key', ['film', 'wall-e']]]);
  });

  it('includes call path when family and metadata paths differ', () => {
    const callsWithFamily = defineCalls({
      films: {
        byId: query<{ id: string }>({
          family: ['films', 'detail'] as const,
        }),
      },
    });

    const key = buildSWRKey(callsWithFamily.films.byId, { id: 'film_123' });

    expect(key).toEqual([
      'callsheet',
      ['films', 'detail'],
      [
        ['call', ['films', 'byId']],
        ['input', { id: 'film_123' }],
      ],
    ]);
  });

  it('matches invalidation families by prefix', () => {
    const key = buildSWRKey(calls.films.byId, { id: 'film_123' });

    expect(matchesFamilyInSWRKey(key, ['films'])).toBe(true);
    expect(matchesFamilyInSWRKey(key, ['films', 'byId'])).toBe(true);
    expect(matchesFamilyInSWRKey(key, ['actors'])).toBe(false);
  });

  it('rejects invalid SWR keys and returns undefined', () => {
    const invalidKey = ['callsheet', ['films', 'byId']];

    expect(isSWRCallKey(invalidKey)).toBe(false);
    expect(extractFamilyFromSWRKey(invalidKey)).toBeUndefined();
    expect(extractIdentityFromSWRKey(invalidKey)).toBeUndefined();
    expect(matchesFamilyInSWRKey(invalidKey, ['films'])).toBe(false);
  });

  it('uses the innermost adapter config through nested SWRConfig', () => {
    const { Wrapper, innerExecute, outerExecute } = createWrapper();

    const { result } = renderHook(() => useSWRAdapterConfig(), {
      wrapper: Wrapper,
    });

    expect(result.current.execute).toBe(innerExecute);
    expect(result.current.execute).not.toBe(outerExecute);
  });

  it('adds the adapter config when no base SWR config is provided', () => {
    const execute = vi.fn(() =>
      Promise.resolve({ source: 'standalone' } as never),
    ) as ExecuteCall;

    const config = withSWRConfig(undefined, { execute });

    expect(getSWRAdapterConfig(config)?.execute).toBe(execute);
  });

  it('preserves parent adapter and cache through functional withSWRConfig', () => {
    const outerCache = new Map();
    const outerExecute = vi.fn(() =>
      Promise.resolve({ source: 'outer' } as never),
    ) as ExecuteCall;

    const Wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig
        value={withSWRConfig(
          {
            provider: () => outerCache,
            dedupingInterval: 1000,
          },
          {
            execute: outerExecute,
          },
        )}
      >
        <SWRConfig
          value={withSWRConfig((parentConfig) => ({
            revalidateOnFocus: false,
            focusThrottleInterval:
              (parentConfig?.focusThrottleInterval ?? 0) + 50,
          }))}
        >
          {children}
        </SWRConfig>
      </SWRConfig>
    );

    const { result } = renderHook(
      () => {
        const config = useSWRConfig();

        return {
          adapter: useSWRAdapterConfig(),
          cache: config.cache,
          dedupingInterval: config.dedupingInterval,
          revalidateOnFocus: config.revalidateOnFocus,
        };
      },
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.adapter.execute).toBe(outerExecute);
    expect(result.current.cache).toBe(outerCache);
    expect(result.current.dedupingInterval).toBe(1000);
    expect(result.current.revalidateOnFocus).toBe(false);
  });

  it('preserves parent cache scope without inheriting the parent provider', () => {
    const outerExecute = vi.fn(() =>
      Promise.resolve({ source: 'outer' } as never),
    ) as ExecuteCall;
    let outerProvidedCache: Map<string, any> | undefined;

    const Wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig
        value={withSWRConfig(
          {
            provider: (cache) => {
              outerProvidedCache = new Map<string, any>();

              for (const key of cache.keys()) {
                outerProvidedCache.set(key, cache.get(key));
              }

              return outerProvidedCache;
            },
          },
          {
            execute: outerExecute,
          },
        )}
      >
        <SWRConfig
          value={withSWRConfig(() => ({
            revalidateOnFocus: false,
          }))}
        >
          {children}
        </SWRConfig>
      </SWRConfig>
    );

    const { result } = renderHook(
      () => {
        const parentConfig = useSWRConfig();

        return {
          adapter: useSWRAdapterConfig(),
          cache: parentConfig.cache,
          revalidateOnFocus: parentConfig.revalidateOnFocus,
        };
      },
      {
        wrapper: Wrapper,
      },
    );

    const childCache = result.current.cache;

    expect(result.current.adapter.execute).toBe(outerExecute);
    expect(result.current.revalidateOnFocus).toBe(false);
    expect(childCache).toBeDefined();
    expect(childCache).toBeInstanceOf(Map);
    expect(childCache).toBe(outerProvidedCache as Cache<unknown>);
  });

  it('allows functional withSWRConfig to override the parent adapter', () => {
    const outerExecute = vi.fn(() =>
      Promise.resolve({ source: 'outer' } as never),
    ) as ExecuteCall;
    const innerExecute = vi.fn(() =>
      Promise.resolve({ source: 'inner' } as never),
    ) as ExecuteCall;

    const Wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig
        value={withSWRConfig(
          {
            provider: () => new Map(),
          },
          {
            execute: outerExecute,
          },
        )}
      >
        <SWRConfig
          value={withSWRConfig(
            () => ({
              revalidateOnFocus: false,
            }),
            {
              execute: innerExecute,
            },
          )}
        >
          {children}
        </SWRConfig>
      </SWRConfig>
    );

    const { result } = renderHook(() => useSWRAdapterConfig(), {
      wrapper: Wrapper,
    });

    expect(result.current.execute).toBe(innerExecute);
    expect(result.current.execute).not.toBe(outerExecute);
  });

  it('throws when functional withSWRConfig cannot resolve an adapter', () => {
    const functionalConfig = withSWRConfig(() => ({
      revalidateOnFocus: false,
    }));

    expect(() => functionalConfig()).toThrow(
      'withSWRConfig(...) could not resolve a Callsheet SWR adapter. Pass one explicitly or preserve the parent config.',
    );
  });

  it('preserves native use and fallback merging in functional withSWRConfig', () => {
    const middleware1 = vi.fn();
    const middleware2 = vi.fn();
    const config = withSWRConfig(
      () => ({
        fallback: {
          b: 'inner',
        },
        use: [middleware2],
      }),
      {
        execute: vi.fn(() => Promise.resolve({ source: 'inner' } as never)),
      },
    );

    const resolvedConfig = config({
      fallback: {
        a: 'outer',
      },
      use: [middleware1],
    });

    expect(resolvedConfig.fallback).toEqual({
      a: 'outer',
      b: 'inner',
    });
    expect(resolvedConfig.use).toEqual([middleware1, middleware2]);
  });

  it('reads the active scoped mutator from SWRConfig', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => {
        const config = useSWRConfig();
        return {
          adapter: getSWRAdapterConfig(config),
          mutate: config.mutate,
        };
      },
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.adapter).toBeDefined();
    expect(result.current.mutate).toBeTypeOf('function');
  });
});
