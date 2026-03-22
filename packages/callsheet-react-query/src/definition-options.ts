import type { CallKind, MutationKind, QueryKind } from '@callsheet/core';
import type {
  CallOptions as CoreCallOptions,
  MutationOptions as CoreMutationOptions,
  QueryOptions as CoreQueryOptions,
} from '@callsheet/core';
import type {
  DefaultError,
  QueryKey,
  UndefinedInitialDataOptions as TanStackUndefinedInitialDataOptions,
  UseMutationOptions,
} from '@tanstack/react-query';

type UnsupportedQueryDefinitionOptionKeys =
  | 'queryFn'
  | 'queryKey'
  | 'queryHash'
  | '_defaulted'
  | 'select'
  | 'enabled'
  | 'initialData'
  | 'initialDataUpdatedAt'
  | 'placeholderData'
  | 'subscribed'
  | 'notifyOnChangeProps'
  | 'suspense'
  | 'experimental_prefetchInRender'
  | 'maxPages';

type UnsupportedMutationDefinitionOptionKeys =
  | 'mutationFn'
  | 'scope'
  | '_defaulted'
  | 'onSuccess';

export type QueryDefinitionOptions<TCallInput = unknown, TCallOutput = unknown> =
  CoreQueryOptions<TCallInput> &
    Omit<
      TanStackUndefinedInitialDataOptions<
        TCallOutput,
        DefaultError,
        TCallOutput,
        QueryKey
      >,
      UnsupportedQueryDefinitionOptionKeys
    >;

export type MutationDefinitionOptions<
  TCallInput = unknown,
  TCallOutput = unknown,
  TOnMutateResult = unknown,
> = CoreMutationOptions<TCallInput, TCallOutput> &
  Omit<
    UseMutationOptions<
      TCallOutput,
      DefaultError,
      TCallInput,
      TOnMutateResult
    >,
    UnsupportedMutationDefinitionOptionKeys
  >;

export type DefinitionOptionsForKind<
  TKind extends CallKind,
  TCallInput,
  TCallOutput,
  TOnMutateResult = unknown,
> = [TKind] extends [QueryKind]
  ? QueryDefinitionOptions<TCallInput, TCallOutput>
  : [TKind] extends [MutationKind]
    ? MutationDefinitionOptions<TCallInput, TCallOutput, TOnMutateResult>
    : CoreCallOptions<TCallInput, TCallOutput>;
