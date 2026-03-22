import type { CallKind, MutationKind, QueryKind } from './call-kind';
import type { CallTypeTag } from './call-type-tag';
import type { CallOptions, MutationOptions, QueryOptions } from './family';

export interface CallMetadata {
  path: readonly string[];
}

type WithSource<TSource> = [TSource] extends [undefined]
  ? Record<never, never>
  : {
      source: TSource;
    };

export type CallOptionsForKind<
  TKind extends CallKind,
  TCallInput,
  TCallOutput,
> = [TKind] extends [QueryKind]
  ? QueryOptions<TCallInput>
  : [TKind] extends [MutationKind]
    ? MutationOptions<TCallInput, TCallOutput>
    : CallOptions<TCallInput, TCallOutput>;

export type Call<
  TKind extends CallKind = CallKind,
  TCallInput = unknown,
  TCallOutput = unknown,
  TSource = undefined,
> = (TKind extends MutationKind
  ? MutationOptions<TCallInput, TCallOutput>
  : QueryOptions<TCallInput>) &
  CallTypeTag<TCallInput, TCallOutput> & {
    kind: TKind;
  } & WithSource<TSource>;

export type QueryCall<
  TCallInput = unknown,
  TCallOutput = unknown,
  TSource = undefined,
> = Call<QueryKind, TCallInput, TCallOutput, TSource>;

export type MutationCall<
  TCallInput = unknown,
  TCallOutput = unknown,
  TSource = undefined,
> = Call<MutationKind, TCallInput, TCallOutput, TSource>;

export type CallInputOf<TCall> =
  TCall extends CallTypeTag<infer TCallInput, infer _TCallOutput>
    ? TCallInput
    : never;

export type CallOutputOf<TCall> =
  TCall extends CallTypeTag<infer _TCallInput, infer TCallOutput>
    ? TCallOutput
    : never;

export type CallSourceOf<TCall> = TCall extends {
  source: infer TSource;
}
  ? TSource
  : never;

export type CallKindOf<TCall> = TCall extends {
  kind: infer TKind extends CallKind;
}
  ? TKind
  : never;
