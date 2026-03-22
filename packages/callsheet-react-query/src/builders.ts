import {
  call as baseCall,
  mutation as baseMutation,
  query as baseQuery,
} from '@callsheet/core';

import type {
  Call,
  CallSourceInputOf,
  CallSourceKindOf,
  CallSourceOutputOf,
  CompatibleSource,
  MutationKind,
  MutationCall,
  QueryKind,
  QueryCall,
} from '@callsheet/core';
import type {
  TsRestRoute,
  TsRestRouteInput,
  TsRestRouteOutput,
} from '@callsheet/core/ts-rest';

import type {
  DefinitionOptionsForKind,
  MutationDefinitionOptions,
  QueryDefinitionOptions,
} from './definition-options';

type TsRestCall<TRoute extends TsRestRoute> =
  CallSourceKindOf<TRoute> extends QueryKind
    ? QueryCall<TsRestRouteInput<TRoute>, TsRestRouteOutput<TRoute>, TRoute>
    : MutationCall<
        TsRestRouteInput<TRoute>,
        TsRestRouteOutput<TRoute>,
        TRoute
      >;

type TsRestQueryCall<TRoute extends TsRestRoute> = QueryCall<
  TsRestRouteInput<TRoute>,
  TsRestRouteOutput<TRoute>,
  TRoute
>;

type TsRestMutationCall<TRoute extends TsRestRoute> = MutationCall<
  TsRestRouteInput<TRoute>,
  TsRestRouteOutput<TRoute>,
  TRoute
>;

type CallBuilder = {
  <TRoute extends TsRestRoute>(
    source: TRoute,
    options?: DefinitionOptionsForKind<
      CallSourceKindOf<TRoute>,
      TsRestRouteInput<TRoute>,
      TsRestRouteOutput<TRoute>
    >,
  ): TsRestCall<TRoute>;
  <TSource>(
    source: TSource,
    options?: DefinitionOptionsForKind<
      CallSourceKindOf<TSource>,
      CallSourceInputOf<TSource>,
      CallSourceOutputOf<TSource>
    >,
  ): Call<
    CallSourceKindOf<TSource>,
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>,
    TSource
  >;
};

type QueryBuilder = {
  <TCallInput = unknown, TCallOutput = unknown>(
    options?: QueryDefinitionOptions<TCallInput, TCallOutput>,
  ): QueryCall<TCallInput, TCallOutput, undefined>;
  <TRoute extends TsRestRoute>(
    source: CompatibleSource<TRoute, QueryKind>,
    options?: QueryDefinitionOptions<
      TsRestRouteInput<TRoute>,
      TsRestRouteOutput<TRoute>
    >,
  ): TsRestQueryCall<TRoute>;
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
  >;
};

type MutationBuilder = {
  <TCallInput = unknown, TCallOutput = unknown, TOnMutateResult = unknown>(
    options?: MutationDefinitionOptions<
      TCallInput,
      TCallOutput,
      TOnMutateResult
    >,
  ): MutationCall<TCallInput, TCallOutput, undefined>;
  <TRoute extends TsRestRoute, TOnMutateResult = unknown>(
    source: CompatibleSource<TRoute, MutationKind>,
    options?: MutationDefinitionOptions<
      TsRestRouteInput<TRoute>,
      TsRestRouteOutput<TRoute>,
      TOnMutateResult
    >,
  ): TsRestMutationCall<TRoute>;
  <TSource, TOnMutateResult = unknown>(
    source: CompatibleSource<TSource, MutationKind>,
    options?: MutationDefinitionOptions<
      CallSourceInputOf<TSource>,
      CallSourceOutputOf<TSource>,
      TOnMutateResult
    >,
  ): MutationCall<
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>,
    TSource
  >;
};

export const call = ((source: unknown, options?: unknown) =>
  baseCall(source as never, options as never)) as CallBuilder;

export const query = ((sourceOrOptions?: unknown, options?: unknown) =>
  baseQuery(sourceOrOptions as never, options as never)) as QueryBuilder;

export const mutation = ((sourceOrOptions?: unknown, options?: unknown) =>
  baseMutation(sourceOrOptions as never, options as never)) as MutationBuilder;
