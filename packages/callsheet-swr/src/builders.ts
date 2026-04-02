import {
  call as baseCall,
  mutation as baseMutation,
  query as baseQuery,
} from '@callsheet/core';

import type {
  DefinitionOptionsForKind,
  MutationDefinitionOptions,
  QueryDefinitionOptions,
} from './definition-options';
import type {
  Call,
  CallSourceInputOf,
  CallSourceKindOf,
  CallSourceOutputOf,
  CompatibleSource,
  MutationCall,
  MutationKind,
  QueryCall,
  QueryKind,
} from '@callsheet/core';

interface QueryBuilder {
  <TCallInput = unknown, TCallOutput = unknown>(
    options?: QueryDefinitionOptions<TCallInput, TCallOutput>,
  ): QueryCall<TCallInput, TCallOutput, undefined> &
    QueryDefinitionOptions<TCallInput, TCallOutput>;
  <TSource>(
    source: CompatibleSource<TSource, QueryKind>,
    options?: QueryDefinitionOptions<
      CallSourceInputOf<TSource>,
      CallSourceOutputOf<TSource>
    >,
  ): QueryCall<
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>,
    TSource
  > &
    QueryDefinitionOptions<
      CallSourceInputOf<TSource>,
      CallSourceOutputOf<TSource>
    >;
}

interface MutationBuilder {
  <TCallInput = unknown, TCallOutput = unknown>(
    options?: MutationDefinitionOptions<TCallInput, TCallOutput>,
  ): MutationCall<TCallInput, TCallOutput, undefined> &
    MutationDefinitionOptions<TCallInput, TCallOutput>;
  <TSource>(
    source: CompatibleSource<TSource, MutationKind>,
    options?: MutationDefinitionOptions<
      CallSourceInputOf<TSource>,
      CallSourceOutputOf<TSource>
    >,
  ): MutationCall<
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>,
    TSource
  > &
    MutationDefinitionOptions<
      CallSourceInputOf<TSource>,
      CallSourceOutputOf<TSource>
    >;
}

export const call = ((source: unknown, options?: unknown) =>
  baseCall(source as never, options as never)) as <TSource>(
  source: TSource,
  options?: DefinitionOptionsForKind<
    CallSourceKindOf<TSource>,
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>
  >,
) => Call<
  CallSourceKindOf<TSource>,
  CallSourceInputOf<TSource>,
  CallSourceOutputOf<TSource>,
  TSource
> &
  DefinitionOptionsForKind<
    CallSourceKindOf<TSource>,
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>
  >;

export const query = ((sourceOrOptions?: unknown, options?: unknown) =>
  baseQuery(sourceOrOptions as never, options as never)) as QueryBuilder;

export const mutation = ((sourceOrOptions?: unknown, options?: unknown) =>
  baseMutation(sourceOrOptions as never, options as never)) as MutationBuilder;
