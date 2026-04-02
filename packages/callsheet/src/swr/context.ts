import { useCallback, useRef } from 'react';
import useSWR, {
  preload as nativePreload,
  unstable_serialize,
  useSWRConfig,
} from 'swr';
import useNativeSWRMutation from 'swr/mutation';

import { resolveSWRCall } from './adapter';
import { useSWRAdapterConfig } from './config';
import { buildSWRKey, matchesFamilyInSWRKey } from './key';
import {
  resolveCallMutationDefaults,
  resolveMutationInvalidations,
  type MutationCallOptions,
  type MutationCallLike,
} from './mutation-options';
import {
  hasExplicitInput,
  type HasNoInput,
  type QueryCallArgs,
  type QueryCallLike,
  type QueryCallOptions,
  resolveCallQueryDefaults,
  resolveQueryEnabled,
  resolveLocalQueryOptions,
} from './query-options';
import { isDevEnv } from '../environment';

import type { CallInputOf, CallOutputOf } from '../call-types';
import type { SWRCallKey, SWRDefaultError, SWRMutationKey } from './types';
import type { MutableRefObject } from 'react';
import type {
  Fetcher,
  Middleware,
  ScopedMutator,
  SWRConfiguration,
  SWRResponse,
} from 'swr';
import type { MutationFetcher, SWRMutationResponse } from 'swr/mutation';

type QueryOptionsArg<TArgs extends readonly unknown[]> =
  TArgs extends readonly [infer TArg, ...unknown[]] ? TArg : undefined;

type QueryFetcher<TCall extends QueryCallLike> = Fetcher<
  CallOutputOf<TCall>,
  SWRCallKey
>;

type QueryConfig<TCall extends QueryCallLike> = SWRConfiguration<
  CallOutputOf<TCall>,
  SWRDefaultError,
  QueryFetcher<TCall>
>;

type QueryResult<
  TCall extends QueryCallLike,
  TConfig = undefined,
> = SWRResponse<
  CallOutputOf<TCall>,
  SWRDefaultError,
  TConfig extends undefined ? Record<string, never> : TConfig
>;

type QueryPreload<TCall extends QueryCallLike> =
  HasNoInput<CallInputOf<TCall>> extends true
    ? () => Promise<CallOutputOf<TCall>>
    : (input: CallInputOf<TCall>) => Promise<CallOutputOf<TCall>>;

type MutationDataForOptions<
  TCall extends MutationCallLike,
  TOptions,
> = TOptions extends { throwOnError: false }
  ? CallOutputOf<TCall> | undefined
  : CallOutputOf<TCall>;

type MutationResult<
  TCall extends MutationCallLike,
  TOptions = undefined,
> = SWRMutationResponse<
  MutationDataForOptions<TCall, TOptions>,
  SWRDefaultError,
  SWRMutationKey,
  CallInputOf<TCall>
>;

type SWRMutationResult<TCall extends MutationCallLike> = SWRMutationResponse<
  CallOutputOf<TCall>,
  SWRDefaultError,
  SWRMutationKey,
  CallInputOf<TCall>
>;

type SWRMutationTrigger<TCall extends MutationCallLike> =
  SWRMutationResult<TCall>['trigger'];

type MutationTriggerOptions<TCall extends MutationCallLike> = Exclude<
  Parameters<SWRMutationTrigger<TCall>>[1],
  undefined
>;

type MutationSuccessCallback<TCall extends MutationCallLike> = (
  data: CallOutputOf<TCall>,
  key: string,
  config: Readonly<Record<string, unknown>>,
) => void;

function hasRewrittenSWRKey(
  runtimeKey: unknown,
  expectedKey: unknown,
): boolean {
  return (
    unstable_serialize(
      runtimeKey as Parameters<typeof unstable_serialize>[0],
    ) !==
    unstable_serialize(expectedKey as Parameters<typeof unstable_serialize>[0])
  );
}

function warnRewrittenSWRKey(
  kind: 'query' | 'mutation',
  runtimeKey: unknown,
  expectedKey: unknown,
): void {
  if (!isDevEnv()) {
    return;
  }

  if (!hasRewrittenSWRKey(runtimeKey, expectedKey)) {
    return;
  }

  console.warn(
    `Callsheet SWR: middleware rewrote this ${kind} key. The request will continue, but Callsheet key matching may not apply. If you control the middleware, derive behavior from the Callsheet key instead of rewriting it.`,
  );
}

function createQueryKeyObserver(expectedKey: SWRCallKey | null): Middleware {
  return (useSWRNext) => (runtimeKey, fetcher, config) => {
    warnRewrittenSWRKey('query', runtimeKey, expectedKey);

    return useSWRNext(runtimeKey, fetcher, config);
  };
}

async function invalidateCallData<TCall extends MutationCallLike>(
  mutate: ScopedMutator,
  call: TCall,
  input: CallInputOf<TCall>,
  output: CallOutputOf<TCall>,
): Promise<void> {
  const invalidationTargets = resolveMutationInvalidations(call, input, output);

  if (invalidationTargets.length === 0) {
    return;
  }

  await Promise.all(
    invalidationTargets.map((family) =>
      mutate((key) => matchesFamilyInSWRKey(key, family), undefined, {
        revalidate: true,
      }),
    ),
  );
}

function resolveMutationTrigger<TCall extends MutationCallLike>(
  trigger: SWRMutationTrigger<TCall>,
  pendingInputRef: MutableRefObject<CallInputOf<TCall> | undefined>,
  onSuccess: MutationCallOptions<TCall>['onSuccess'] | undefined,
  invalidate: (
    input: CallInputOf<TCall>,
    output: CallOutputOf<TCall>,
  ) => Promise<void>,
): SWRMutationTrigger<TCall> {
  return ((...args: Parameters<SWRMutationTrigger<TCall>>) => {
    const input = args[0] as CallInputOf<TCall>;
    const triggerOptions = args[1] as MutationTriggerOptions<TCall> | undefined;
    const callOnSuccess = (triggerOptions?.onSuccess ?? onSuccess) as
      | MutationSuccessCallback<TCall>
      | undefined;
    let didSucceed = false;
    let successfulOutput: CallOutputOf<TCall> | undefined;
    const resolvedOptions = {
      ...(triggerOptions ?? {}),
      onSuccess: (
        data: CallOutputOf<TCall>,
        key: string,
        config: Readonly<Record<string, unknown>>,
      ) => {
        callOnSuccess?.(data, key, config);
        didSucceed = true;
        successfulOutput = data;
      },
    } as MutationTriggerOptions<TCall>;

    pendingInputRef.current = input;

    try {
      const callTrigger = trigger as unknown as (
        input: CallInputOf<TCall>,
        options?: MutationTriggerOptions<TCall>,
      ) => ReturnType<SWRMutationTrigger<TCall>>;

      return Promise.resolve(callTrigger(input, resolvedOptions)).then(
        async (output) => {
          if (didSucceed) {
            await invalidate(
              input,
              successfulOutput ?? (output as CallOutputOf<TCall>),
            );
          }

          return output;
        },
      ) as ReturnType<SWRMutationTrigger<TCall>>;
    } finally {
      pendingInputRef.current = undefined;
    }
  }) as unknown as SWRMutationTrigger<TCall>;
}

export function useQuery<
  TCall extends QueryCallLike,
  TArgs extends QueryCallArgs<TCall>,
>(call: TCall, ...args: TArgs): QueryResult<TCall, QueryOptionsArg<TArgs>> {
  const config = useSWRConfig();
  const adapter = useSWRAdapterConfig();
  const [options] = args;
  const enabled = resolveQueryEnabled(options);
  const input = options?.input as CallInputOf<TCall>;
  const includeInputSegment = hasExplicitInput(options);
  const callDefinedDefaults = resolveCallQueryDefaults(call);
  const localOptions = resolveLocalQueryOptions(options);
  const key = enabled ? buildSWRKey(call, input, includeInputSegment) : null;
  const fetcher: QueryFetcher<TCall> | null = enabled
    ? () =>
        resolveSWRCall({
          adapter,
          call,
          config,
          includeInputSegment,
          input,
          mutate: config.mutate,
        }).execute()
    : null;
  const mergedOptions = {
    ...callDefinedDefaults,
    ...(localOptions ?? {}),
  };
  const swrOptions: QueryConfig<TCall> = isDevEnv()
    ? {
        ...mergedOptions,
        use: [...(mergedOptions.use ?? []), createQueryKeyObserver(key)],
      }
    : mergedOptions;

  if (!enabled) {
    const disabledOptions: QueryConfig<TCall> = {
      ...swrOptions,
      // SWR accepts null here at runtime, but the typed config is not updated for it.
      fetcher: null as never,
    };

    return useSWR(null, null, disabledOptions) as QueryResult<
      TCall,
      QueryOptionsArg<TArgs>
    >;
  }

  if (Object.keys(swrOptions).length > 0) {
    return useSWR(key, fetcher, swrOptions) as QueryResult<
      TCall,
      QueryOptionsArg<TArgs>
    >;
  }

  return useSWR(key, fetcher) as QueryResult<TCall, QueryOptionsArg<TArgs>>;
}

export const useSWRQuery: typeof useQuery = useQuery;

export function usePreload<TCall extends QueryCallLike>(
  call: TCall,
): QueryPreload<TCall> {
  const config = useSWRConfig();
  const adapter = useSWRAdapterConfig();

  const preloadQuery = useCallback(
    (...args: [input?: CallInputOf<TCall>]) => {
      const includeInputSegment = args.length > 0;
      const input = includeInputSegment
        ? (args[0]! as CallInputOf<TCall>)
        : (undefined as CallInputOf<TCall>);
      const key = buildSWRKey(call, input, includeInputSegment);

      return nativePreload(key, () =>
        resolveSWRCall({
          adapter,
          call,
          config,
          includeInputSegment,
          input,
          mutate: config.mutate,
        }).execute(),
      ) as Promise<CallOutputOf<TCall>>;
    },
    [adapter, call, config],
  );

  return preloadQuery as QueryPreload<TCall>;
}

export const useSWRPreload: typeof usePreload = usePreload;

export function useMutation<
  TCall extends MutationCallLike,
  TOptions extends MutationCallOptions<TCall> | undefined = undefined,
>(call: TCall, options?: TOptions): MutationResult<TCall, TOptions> {
  const config = useSWRConfig();
  const adapter = useSWRAdapterConfig();
  const pendingInputRef = useRef<CallInputOf<TCall> | undefined>(undefined);
  const key = useCallback(
    () => buildSWRKey(call, pendingInputRef.current!, false),
    [call],
  );
  const fetcher: MutationFetcher<
    CallOutputOf<TCall>,
    SWRMutationKey,
    CallInputOf<TCall>
  > = (runtimeKey, { arg }) => {
    const callsheetKey = buildSWRKey(call, arg, false);

    warnRewrittenSWRKey('mutation', runtimeKey, callsheetKey);

    return resolveSWRCall({
      adapter,
      call,
      config,
      includeInputSegment: false,
      input: arg,
      mutate: config.mutate,
    }).execute();
  };
  const callDefinedDefaults = resolveCallMutationDefaults(call);
  const mergedOptions = {
    ...callDefinedDefaults,
    ...(options ?? {}),
  };
  const { onSuccess, ...swrMutationOptions } = mergedOptions;
  const resolvedMutation = Object.keys(swrMutationOptions).length
    ? useNativeSWRMutation(key, fetcher, swrMutationOptions)
    : useNativeSWRMutation(key, fetcher);
  const invalidate = useCallback(
    async (input: CallInputOf<TCall>, output: CallOutputOf<TCall>) => {
      await invalidateCallData(config.mutate, call, input, output);
    },
    [call, config.mutate],
  );
  const trigger = useCallback(
    resolveMutationTrigger<TCall>(
      resolvedMutation.trigger,
      pendingInputRef,
      onSuccess,
      invalidate,
    ),
    [invalidate, onSuccess, resolvedMutation.trigger],
  ) as MutationResult<TCall, TOptions>['trigger'];

  return {
    ...resolvedMutation,
    trigger,
  } as MutationResult<TCall, TOptions>;
}

export const useSWRMutation: typeof useMutation = useMutation;

export type { MutationCallOptions };
export type { QueryCallOptions };
