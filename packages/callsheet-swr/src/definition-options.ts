import type {
  CallKind,
  CallOptions as CoreCallOptions,
  MutationKind,
  MutationOptions as CoreMutationOptions,
  QueryKind,
  QueryOptions as CoreQueryOptions,
} from '@callsheet/core';
import type { SWRMutationKey } from '@callsheet/core/swr';
import type { SWRConfiguration } from 'swr';
import type { SWRMutationConfiguration } from 'swr/mutation';

type UnsupportedQueryDefinitionOptionKeys =
  | 'fetcher'
  | 'fallbackData'
  | 'suspense'
  | 'keepPreviousData'
  | 'onSuccess'
  | 'onError'
  | 'onLoadingSlow'
  | 'onErrorRetry'
  | 'onDiscarded'
  | 'fallback'
  | 'use'
  | 'isPaused'
  | 'isOnline'
  | 'isVisible'
  | 'compare'
  | 'dedupingInterval'
  | 'focusThrottleInterval'
  | 'loadingTimeout';

export type QueryDefinitionOptions<
  TCallInput = unknown,
  TCallOutput = unknown,
> = CoreQueryOptions<TCallInput> &
  Omit<SWRConfiguration<TCallOutput>, UnsupportedQueryDefinitionOptionKeys>;

type UnsupportedMutationDefinitionOptionKeys =
  | 'fetcher'
  | 'onSuccess'
  | 'onError'
  | 'optimisticData'
  | 'rollbackOnError';

export type MutationDefinitionOptions<
  TCallInput = unknown,
  TCallOutput = unknown,
> = CoreMutationOptions<TCallInput, TCallOutput> &
  Omit<
    SWRMutationConfiguration<
      TCallOutput,
      unknown,
      SWRMutationKey,
      TCallInput,
      TCallOutput
    >,
    UnsupportedMutationDefinitionOptionKeys
  >;

export type DefinitionOptionsForKind<
  TKind extends CallKind,
  TCallInput,
  TCallOutput,
> = [TKind] extends [QueryKind]
  ? QueryDefinitionOptions<TCallInput, TCallOutput>
  : [TKind] extends [MutationKind]
    ? MutationDefinitionOptions<TCallInput, TCallOutput>
    : CoreCallOptions<TCallInput, TCallOutput>;
