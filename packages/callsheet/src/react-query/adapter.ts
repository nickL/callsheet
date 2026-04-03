import {
  mutationOptions as tanstackMutationOptions,
  skipToken,
} from '@tanstack/react-query';

import { buildInvalidationKey, type QueryCallKey } from './query-key';
import { hasExplicitInput } from './query-options';

import type { CallContext, CallInputContext } from '../call-context';
import type { MutationKind } from '../call-kind';
import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type { Family, InvalidationConfig } from '../family';
import type {
  QueryCallLike,
  QueryConfig,
  QueryConfigWithInitialData,
  QueryConfigWithoutInitialData,
} from './query-options';
import type {
  DefaultError,
  DefinedInitialDataOptions as TanStackDefinedInitialDataOptions,
  MutationFunction,
  MutationFunctionContext,
  QueryClient,
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
  SkipToken,
  UndefinedInitialDataOptions as TanStackUndefinedInitialDataOptions,
  UseMutationOptions,
} from '@tanstack/react-query';

type CallLike = CallTypeTag<unknown, unknown> & {
  kind: MutationKind | QueryCallLike['kind'];
};
type MutationCallLike = CallTypeTag<unknown, unknown> & {
  kind: MutationKind;
};

export type MutationCallOptions<
  TCall extends MutationCallLike,
  TOnMutateResult = unknown,
> = Omit<
  UseMutationOptions<
    CallOutputOf<TCall>,
    DefaultError,
    CallInputOf<TCall>,
    TOnMutateResult
  >,
  'mutationFn'
>;

export type ResolvedMutationOptions<
  TCall extends MutationCallLike,
  TOnMutateResult = unknown,
> = MutationCallOptions<TCall, TOnMutateResult> & {
  mutationFn: MutationFunction<CallOutputOf<TCall>, CallInputOf<TCall>>;
};

type ResolvedQueryOptionsWithoutInitialData<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> = Omit<
  TanStackUndefinedInitialDataOptions<
    CallOutputOf<TCall>,
    DefaultError,
    TSelected,
    QueryCallKey<TCall>
  >,
  'queryFn' | 'queryKey'
> & {
  queryFn: QueryFunction<CallOutputOf<TCall>, QueryCallKey<TCall>> | SkipToken;
  queryKey: QueryCallKey<TCall>;
};

type ResolvedQueryOptionsWithInitialData<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> = Omit<
  TanStackDefinedInitialDataOptions<
    CallOutputOf<TCall>,
    DefaultError,
    TSelected,
    QueryCallKey<TCall>
  >,
  'queryFn' | 'queryKey'
> & {
  queryFn: QueryFunction<CallOutputOf<TCall>, QueryCallKey<TCall>> | SkipToken;
  queryKey: QueryCallKey<TCall>;
};

export type ResolvedQueryOptions<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> =
  | ResolvedQueryOptionsWithoutInitialData<TCall, TSelected>
  | ResolvedQueryOptionsWithInitialData<TCall, TSelected>;

export type ExecuteCallContext<TCall extends CallLike> = CallContext<TCall> &
  CallInputContext<CallInputOf<TCall>> & {
    reactQuery?: QueryFunctionContext<QueryKey> | MutationFunctionContext;
  };

export type ExecuteCall = <TCall extends CallLike>(
  context: ExecuteCallContext<TCall>,
) => Promise<CallOutputOf<TCall>>;

export interface ReactQueryAdapterConfig {
  execute: ExecuteCall;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error('A non-Error value was thrown.');
}

function resolveCallQueryDefaults<TCall extends QueryCallLike>(
  call: TCall,
): Record<string, unknown> {
  const {
    _defaulted: _ignoredDefaulted,
    enabled: _ignoredEnabled,
    experimental_prefetchInRender: _ignoredExperimentalPrefetchInRender,
    initialData: _ignoredInitialData,
    initialDataUpdatedAt: _ignoredInitialDataUpdatedAt,
    invalidates: _ignoredInvalidates,
    key: _ignoredKey,
    kind: _ignoredKind,
    maxPages: _ignoredMaxPages,
    notifyOnChangeProps: _ignoredNotifyOnChangeProps,
    placeholderData: _ignoredPlaceholderData,
    queryFn: _ignoredQueryFn,
    queryHash: _ignoredQueryHash,
    queryKey: _ignoredQueryKey,
    family: _ignoredFamily,
    select: _ignoredSelect,
    source: _ignoredSource,
    subscribed: _ignoredSubscribed,
    suspense: _ignoredSuspense,
    ...reactQueryDefaults
  } = call as TCall & Record<string, unknown>;

  return reactQueryDefaults;
}

function resolveCallMutationDefaults<TCall extends MutationCallLike>(
  call: TCall,
): Record<string, unknown> {
  const {
    _defaulted: _ignoredDefaulted,
    family: _ignoredFamily,
    invalidates: _ignoredInvalidates,
    key: _ignoredKey,
    kind: _ignoredKind,
    mutationFn: _ignoredMutationFn,
    onSuccess: _ignoredOnSuccess,
    source: _ignoredSource,
    ...reactQueryDefaults
  } = call as TCall & Record<string, unknown>;

  return reactQueryDefaults;
}

function resolveMutationInvalidations<TCall extends MutationCallLike>(
  call: TCall & {
    invalidates?: InvalidationConfig<CallInputOf<TCall>, CallOutputOf<TCall>>;
  },
  input: CallInputOf<TCall>,
  output: CallOutputOf<TCall>,
): readonly Family[] {
  if (typeof call.invalidates === 'function') {
    return call.invalidates({ input, output });
  }

  return call.invalidates ?? [];
}

export interface ReactQueryAdapter {
  resolveQueryOptions<
    TCall extends QueryCallLike,
    TSelected = CallOutputOf<TCall>,
  >(
    config: QueryConfigWithInitialData<TCall, TSelected>,
  ): ResolvedQueryOptionsWithInitialData<TCall, TSelected>;
  resolveQueryOptions<
    TCall extends QueryCallLike,
    TSelected = CallOutputOf<TCall>,
  >(
    config: QueryConfigWithoutInitialData<TCall, TSelected>,
  ): ResolvedQueryOptionsWithoutInitialData<TCall, TSelected>;
  fetchQuery<TCall extends QueryCallLike, TSelected = CallOutputOf<TCall>>(
    queryClient: QueryClient,
    config: QueryConfig<TCall, TSelected>,
  ): Promise<TSelected>;
  prefetchQuery<TCall extends QueryCallLike, TSelected = CallOutputOf<TCall>>(
    queryClient: QueryClient,
    config: QueryConfig<TCall, TSelected>,
  ): Promise<void>;
  mutationOptions<TCall extends MutationCallLike, TOnMutateResult = unknown>(
    call: TCall,
    options?: MutationCallOptions<TCall, TOnMutateResult>,
  ): ResolvedMutationOptions<TCall, TOnMutateResult>;
  invalidateCallData<TCall extends MutationCallLike>(
    queryClient: QueryClient,
    call: TCall,
    input: CallInputOf<TCall>,
    output: CallOutputOf<TCall>,
  ): Promise<void>;
}

export function createReactQueryAdapter(
  config: ReactQueryAdapterConfig,
): ReactQueryAdapter {
  function resolveQueryOptions<
    TCall extends QueryCallLike,
    TSelected = CallOutputOf<TCall>,
  >(
    queryConfig: QueryConfigWithInitialData<TCall, TSelected>,
  ): ResolvedQueryOptionsWithInitialData<TCall, TSelected>;
  function resolveQueryOptions<
    TCall extends QueryCallLike,
    TSelected = CallOutputOf<TCall>,
  >(
    queryConfig: QueryConfigWithoutInitialData<TCall, TSelected>,
  ): ResolvedQueryOptionsWithoutInitialData<TCall, TSelected>;
  function resolveQueryOptions<
    TCall extends QueryCallLike,
    TSelected = CallOutputOf<TCall>,
  >(
    queryConfig: QueryConfig<TCall, TSelected>,
  ): ResolvedQueryOptions<TCall, TSelected> {
    const call = queryConfig.call;
    const callDefinedDefaults = resolveCallQueryDefaults(call);
    const input = queryConfig.input as CallInputOf<TCall> | undefined;
    const shouldSkipExecution =
      queryConfig.enabled === false && !hasExplicitInput(queryConfig);
    const {
      call: _call,
      input: _input,
      queryKey,
      ...reactQueryOptions
    } = queryConfig;

    return {
      ...callDefinedDefaults,
      ...reactQueryOptions,
      queryKey,
      queryFn: shouldSkipExecution
        ? skipToken
        : (reactQuery) =>
            config.execute({
              call,
              input: input!,
              reactQuery,
            }),
    } as ResolvedQueryOptions<TCall, TSelected>;
  }

  async function fetchQuery<
    TCall extends QueryCallLike,
    TSelected = CallOutputOf<TCall>,
  >(
    queryClient: QueryClient,
    queryConfig: QueryConfig<TCall, TSelected>,
  ): Promise<TSelected> {
    return queryClient.fetchQuery(
      resolveQueryOptions(queryConfig),
    ) as Promise<TSelected>;
  }

  async function prefetchQuery<
    TCall extends QueryCallLike,
    TSelected = CallOutputOf<TCall>,
  >(
    queryClient: QueryClient,
    queryConfig: QueryConfig<TCall, TSelected>,
  ): Promise<void> {
    await queryClient.prefetchQuery(resolveQueryOptions(queryConfig));
  }

  function mutationOptions<
    TCall extends MutationCallLike,
    TOnMutateResult = unknown,
  >(
    call: TCall,
    options?: MutationCallOptions<TCall, TOnMutateResult>,
  ): ResolvedMutationOptions<TCall, TOnMutateResult> {
    const callDefinedDefaults = resolveCallMutationDefaults(call);

    return tanstackMutationOptions({
      ...callDefinedDefaults,
      ...options,
      mutationFn: (
        input: CallInputOf<TCall>,
        reactQuery: MutationFunctionContext,
      ) =>
        config.execute({
          call,
          input,
          reactQuery,
        }),
      onSuccess: async (output, input, onMutateResult, context) => {
        let userOnSuccessError: unknown;

        try {
          await options?.onSuccess?.(output, input, onMutateResult, context);
        } catch (error) {
          userOnSuccessError = error;
        }

        try {
          await invalidateCallData(context.client, call, input, output);
        } catch (invalidationError) {
          throw toError(userOnSuccessError ?? invalidationError);
        }

        if (userOnSuccessError) {
          throw toError(userOnSuccessError);
        }
      },
    }) as ResolvedMutationOptions<TCall, TOnMutateResult>;
  }

  async function invalidateCallData<TCall extends MutationCallLike>(
    queryClient: QueryClient,
    call: TCall,
    input: CallInputOf<TCall>,
    output: CallOutputOf<TCall>,
  ): Promise<void> {
    const invalidationTargets = resolveMutationInvalidations(
      call,
      input,
      output,
    );

    await Promise.all(
      invalidationTargets.map((family) =>
        queryClient.invalidateQueries({
          queryKey: buildInvalidationKey(family),
        }),
      ),
    );
  }

  return {
    fetchQuery,
    invalidateCallData,
    mutationOptions,
    prefetchQuery,
    resolveQueryOptions,
  };
}
