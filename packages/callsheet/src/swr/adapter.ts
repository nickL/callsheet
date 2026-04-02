import { useSWRConfig } from 'swr';

import { useSWRAdapterConfig } from './config';
import { buildSWRKey } from './key';

import type { CallLike } from '../call-identity';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type { Family, KeyConfig } from '../family';
import type {
  ExecuteCallContext,
  ExecuteCallMiddleware,
  ExecuteCallOverrides,
  SWRAdapterConfig,
  SWRCallKey,
} from './types';
import type { ScopedMutator, SWRConfiguration } from 'swr';

type ResolvableSWRCall<TCall extends CallLike> = TCall & {
  key?: KeyConfig<CallInputOf<TCall>>;
  family?: Family;
};

interface ResolveSWRCallOptions<TCall extends CallLike> {
  adapter: SWRAdapterConfig;
  config: SWRConfiguration;
  mutate: ScopedMutator;
  call: ResolvableSWRCall<TCall>;
  input: CallInputOf<TCall>;
  includeInputSegment?: boolean;
}

interface UseResolvedSWRCallOptions {
  includeInputSegment?: boolean;
}

export interface ResolvedSWRCall<TCall extends CallLike> {
  adapter: SWRAdapterConfig;
  call: ResolvableSWRCall<TCall>;
  config: SWRConfiguration;
  input: CallInputOf<TCall>;
  key: SWRCallKey;
  mutate: ScopedMutator;
  toExecuteCallContext(): ExecuteCallContext<TCall>;
  execute(): Promise<CallOutputOf<TCall>>;
}

export function toExecuteCallContext<TCall extends CallLike>(
  resolvedCall: ExecuteCallContext<TCall>,
): ExecuteCallContext<TCall> {
  return {
    call: resolvedCall.call,
    config: resolvedCall.config,
    input: resolvedCall.input,
    key: resolvedCall.key,
    mutate: resolvedCall.mutate,
  };
}

function mergeExecuteCallContext<TCall extends CallLike>(
  context: ExecuteCallContext<TCall>,
  overrides?: ExecuteCallOverrides,
): ExecuteCallContext<TCall> {
  if (!overrides?.execution) {
    return context;
  }

  return {
    ...context,
    execution: {
      ...(context.execution ?? {}),
      ...overrides.execution,
    },
  };
}

function executeWithMiddleware<TCall extends CallLike>(
  context: ExecuteCallContext<TCall>,
  execute: SWRAdapterConfig['execute'],
  middleware: readonly ExecuteCallMiddleware[] | undefined,
): Promise<CallOutputOf<TCall>> {
  if (!middleware || middleware.length === 0) {
    return execute(context);
  }

  const run = (
    index: number,
    nextContext: ExecuteCallContext<TCall>,
  ): Promise<CallOutputOf<TCall>> => {
    const current = middleware[index];

    if (!current) {
      return execute(nextContext);
    }

    return current(nextContext, (overrides) =>
      run(index + 1, mergeExecuteCallContext(nextContext, overrides)),
    );
  };

  return run(0, context);
}

export function resolveSWRCall<TCall extends CallLike>(
  options: ResolveSWRCallOptions<TCall>,
): ResolvedSWRCall<TCall> {
  const key = buildSWRKey(
    options.call,
    options.input,
    options.includeInputSegment,
  );

  const resolvedCall: ResolvedSWRCall<TCall> = {
    adapter: options.adapter,
    call: options.call,
    config: options.config,
    input: options.input,
    key,
    mutate: options.mutate,
    toExecuteCallContext() {
      return toExecuteCallContext(resolvedCall);
    },
    execute() {
      return executeWithMiddleware(
        resolvedCall.toExecuteCallContext(),
        options.adapter.execute,
        options.adapter.middleware,
      );
    },
  };

  return resolvedCall;
}

export function useResolvedSWRCall<TCall extends CallLike>(
  call: ResolvableSWRCall<TCall>,
  input: CallInputOf<TCall>,
  options?: UseResolvedSWRCallOptions,
): ResolvedSWRCall<TCall> {
  const config = useSWRConfig();
  const adapter = useSWRAdapterConfig();
  const resolveOptions: ResolveSWRCallOptions<TCall> = {
    adapter,
    call,
    config,
    input,
    mutate: config.mutate,
  };

  if (options?.includeInputSegment !== undefined) {
    resolveOptions.includeInputSegment = options.includeInputSegment;
  }

  return resolveSWRCall(resolveOptions);
}
