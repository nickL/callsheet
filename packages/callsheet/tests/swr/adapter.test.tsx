// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { SWRConfig, useSWRConfig } from 'swr';

import { defineCalls, query } from '../../src';
import { getSWRAdapterConfig, withSWRConfig } from '../../src/swr';
import {
  resolveSWRCall,
  toExecuteCallContext,
  useResolvedSWRCall,
} from '../../src/swr/adapter';

import type {
  ExecuteCall,
  ExecuteCallContext,
  ExecuteCallMiddleware,
} from '../../src/swr';
import type { PropsWithChildren } from 'react';

function createWrapper(options?: {
  outerMiddleware?: readonly ExecuteCallMiddleware[];
  innerMiddleware?: readonly ExecuteCallMiddleware[];
}) {
  const outerCache = new Map();
  const innerCache = new Map();
  const outerExecute = vi.fn(() =>
    Promise.resolve({ source: 'outer' } as never),
  );
  const innerExecute = vi.fn(() =>
    Promise.resolve({ source: 'inner' } as never),
  );
  const outerAdapter = options?.outerMiddleware?.length
    ? {
        execute: outerExecute as ExecuteCall,
        middleware: options.outerMiddleware,
      }
    : {
        execute: outerExecute as ExecuteCall,
      };
  const innerAdapter = options?.innerMiddleware?.length
    ? {
        execute: innerExecute as ExecuteCall,
        middleware: options.innerMiddleware,
      }
    : {
        execute: innerExecute as ExecuteCall,
      };

  const Wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={withSWRConfig({ provider: () => outerCache }, outerAdapter)}
    >
      <SWRConfig
        value={withSWRConfig({ provider: () => innerCache }, innerAdapter)}
      >
        {children}
      </SWRConfig>
    </SWRConfig>
  );

  return {
    Wrapper,
    innerExecute,
    outerExecute,
  };
}

describe('swr adapter', () => {
  const calls = defineCalls({
    films: {
      byId: query<{ id: string }>(),
    },
  });

  it('resolves the execute context for a call', () => {
    const config = {
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useSWRConfig>;
    const execute = vi.fn(() =>
      Promise.resolve({ id: 'film_123' } as never),
    ) as ExecuteCall;

    const resolvedCall = resolveSWRCall({
      adapter: { execute },
      call: calls.films.byId,
      config,
      input: { id: 'film_123' },
      mutate: config.mutate,
    });

    expect(toExecuteCallContext(resolvedCall)).toEqual({
      call: calls.films.byId,
      config,
      input: { id: 'film_123' },
      key: ['callsheet', ['films', 'byId'], [['input', { id: 'film_123' }]]],
      mutate: config.mutate,
    });
  });

  it('uses the active scoped config and mutator when resolving a call', async () => {
    const { Wrapper, innerExecute, outerExecute } = createWrapper();

    const { result } = renderHook(
      () => {
        const config = useSWRConfig();
        return {
          resolvedCall: useResolvedSWRCall(calls.films.byId, {
            id: 'film_123',
          }),
          config,
        };
      },
      { wrapper: Wrapper },
    );

    const output = await result.current.resolvedCall.execute();

    expect(output).toEqual({ source: 'inner' });
    expect(innerExecute).toHaveBeenCalledTimes(1);
    expect(outerExecute).not.toHaveBeenCalled();

    const [context] = innerExecute.mock.calls[0] as unknown as [
      ExecuteCallContext<typeof calls.films.byId>,
    ];

    expect(context.mutate).toBe(result.current.config.mutate);
    expect(context.key).toEqual(result.current.resolvedCall.key);
    expect(getSWRAdapterConfig(context.config)?.execute).toBe(
      result.current.resolvedCall.adapter.execute,
    );
  });

  it('allows calls to omit input identity', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useResolvedSWRCall(
          calls.films.byId,
          {
            id: 'film_123',
          },
          {
            includeInputSegment: false,
          },
        ),
      { wrapper: Wrapper },
    );

    expect(result.current.key).toEqual(['callsheet', ['films', 'byId'], []]);
  });

  it('keeps canonical keys consistent when resolving a call', () => {
    const config = {
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useSWRConfig>;
    const execute = vi.fn(() =>
      Promise.resolve({ id: 'film_123' } as never),
    ) as ExecuteCall;

    const resolvedCall = resolveSWRCall({
      adapter: { execute },
      call: calls.films.byId,
      config,
      input: { id: 'film_123' },
      mutate: config.mutate,
    });

    expect(resolvedCall.key).toEqual([
      'callsheet',
      ['films', 'byId'],
      [['input', { id: 'film_123' }]],
    ]);
  });

  it('runs execute middleware and merges execution metadata', async () => {
    const config = {
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useSWRConfig>;
    const execute = vi.fn(
      (context: ExecuteCallContext<typeof calls.films.byId>) =>
        Promise.resolve({
          execution: context.execution,
        } as never),
    ) as ExecuteCall;
    const firstMiddleware: ExecuteCallMiddleware = async (context, next) => {
      expect(context.execution).toBeUndefined();

      return next({
        execution: {
          transportKey: 'wall-e',
        },
      });
    };
    const secondMiddleware: ExecuteCallMiddleware = async (context, next) => {
      expect(context.execution).toEqual({
        transportKey: 'wall-e',
      });

      return next({
        execution: {
          source: 'middleware',
        },
      });
    };
    const resolvedCall = resolveSWRCall({
      adapter: {
        execute,
        middleware: [firstMiddleware, secondMiddleware],
      },
      call: calls.films.byId,
      config,
      input: { id: 'film_123' },
      mutate: config.mutate,
    });

    await resolvedCall.execute();

    expect(execute).toHaveBeenCalledWith({
      call: calls.films.byId,
      config,
      execution: {
        source: 'middleware',
        transportKey: 'wall-e',
      },
      input: { id: 'film_123' },
      key: ['callsheet', ['films', 'byId'], [['input', { id: 'film_123' }]]],
      mutate: config.mutate,
    });
  });

  it('replaces outer execute middleware through nested SWRConfig', async () => {
    const outerMiddlewareSpy = vi.fn();
    const innerMiddlewareSpy = vi.fn();
    const outerMiddleware: ExecuteCallMiddleware = (_context, next) => {
      outerMiddlewareSpy();

      return next({
        execution: {
          source: 'outer',
        },
      });
    };
    const innerMiddleware: ExecuteCallMiddleware = (_context, next) => {
      innerMiddlewareSpy();

      return next({
        execution: {
          source: 'inner',
        },
      });
    };
    const { Wrapper, innerExecute, outerExecute } = createWrapper({
      innerMiddleware: [innerMiddleware],
      outerMiddleware: [outerMiddleware],
    });

    const { result } = renderHook(
      () => useResolvedSWRCall(calls.films.byId, { id: 'film_123' }),
      { wrapper: Wrapper },
    );

    const output = await result.current.execute();

    expect(output).toEqual({ source: 'inner' });
    expect(innerMiddlewareSpy).toHaveBeenCalledTimes(1);
    expect(outerMiddlewareSpy).not.toHaveBeenCalled();
    expect(innerExecute).toHaveBeenCalledTimes(1);
    expect(outerExecute).not.toHaveBeenCalled();

    const [context] = innerExecute.mock.calls[0] as unknown as [
      ExecuteCallContext<typeof calls.films.byId>,
    ];

    expect(context.execution).toEqual({
      source: 'inner',
    });
  });

  it('throws when the SWR adapter config is missing', () => {
    const Wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    );

    expect(() =>
      renderHook(
        () => useResolvedSWRCall(calls.films.byId, { id: 'film_123' }),
        {
          wrapper: Wrapper,
        },
      ),
    ).toThrow(
      'Unable to resolve the Callsheet SWR adapter config from SWRConfig. Wrap your tree in <SWRConfig value={withSWRConfig(...)} />.',
    );
  });
});
