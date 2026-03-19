import { CALL_KINDS } from './call-kind';
import { registerCall } from './call-registry';
import {
  assertSourceKind,
  inferCallKind,
  hasSourceShape,
  isGraphQLDocumentLike,
  isRecognizedSource,
  getSourceKind,
} from './call-sources';

import type { CallKind, MutationKind, QueryKind } from './call-kind';
import type {
  CallSourceInputOf,
  CallSourceKindOf,
  CallSourceOutputOf,
  CompatibleSource,
} from './call-sources';
import type { CallTypeTag } from './call-type-tag';
import type {
  Call,
  CallOptionsForKind,
  MutationCall,
  QueryCall,
} from './call-types';
import type { CallOptions, MutationOptions, QueryOptions } from './scope';

interface OptionsOnlyShape {
  callsheetKind?: never;
  definitions?: never;
  method?: never;
  path?: never;
}

type QueryBuilderOptions<TCallInput, TCallOutput> = QueryOptions<TCallInput> &
  CallTypeTag<TCallInput, TCallOutput> &
  OptionsOnlyShape;

type MutationBuilderOptions<TCallInput, TCallOutput> = MutationOptions<
  TCallInput,
  TCallOutput
> &
  CallTypeTag<TCallInput, TCallOutput> &
  OptionsOnlyShape;

function throwInvalidExplicitSource(source: unknown): never {
  if (isGraphQLDocumentLike(source)) {
    throw new Error(
      'GraphQL documents used with callsheet must contain a query or mutation operation definition.',
    );
  }

  throw new Error('The provided source shape is not supported by callsheet.');
}

function createCall<TKind extends CallKind, TCallInput, TCallOutput, TSource>(
  kind: TKind,
  source: TSource,
  options:
    | CallOptionsForKind<TKind, TCallInput, TCallOutput>
    | CallOptions<TCallInput, TCallOutput>
    | undefined,
): Call<TKind, TCallInput, TCallOutput, TSource> {
  const callValue = {
    ...(options ?? {}),
    kind,
  } as Call<TKind, TCallInput, TCallOutput, TSource> & Record<string, unknown>;

  if (source !== undefined) {
    callValue.source = source;
  }

  registerCall(callValue);

  return callValue;
}

function createQueryCall<TCallInput, TCallOutput>(
  options?: QueryBuilderOptions<TCallInput, TCallOutput>,
): QueryCall<TCallInput, TCallOutput, undefined> {
  return createCall(CALL_KINDS.query, undefined, options);
}

function createMutationCall<TCallInput, TCallOutput>(
  options?: MutationBuilderOptions<TCallInput, TCallOutput>,
): MutationCall<TCallInput, TCallOutput, undefined> {
  return createCall(CALL_KINDS.mutation, undefined, options);
}

/**
 * Preferred contract-aware entrypoint. Callsheet infers the call kind from the source.
 */
export function call<const TSource>(
  source: TSource,
  options?: CallOptionsForKind<
    CallSourceKindOf<TSource>,
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>
  >,
): Call<
  CallSourceKindOf<TSource>,
  CallSourceInputOf<TSource>,
  CallSourceOutputOf<TSource>,
  TSource
> {
  const kind = inferCallKind(source) as CallSourceKindOf<TSource>;

  return createCall(kind, source, options);
}

/**
 * Explicit call helper for read-like calls.
 */
export function query<TCallInput = unknown, TCallOutput = unknown>(
  options?: QueryBuilderOptions<TCallInput, TCallOutput>,
): QueryCall<TCallInput, TCallOutput, undefined>;
export function query<const TSource>(
  source: CompatibleSource<TSource, QueryKind>,
  options?: QueryBuilderOptions<
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>
  >,
): QueryCall<CallSourceInputOf<TSource>, CallSourceOutputOf<TSource>, TSource>;
export function query<
  TCallInput = unknown,
  TCallOutput = unknown,
  const TSource = undefined,
>(
  sourceOrDefinition?: TSource | QueryBuilderOptions<TCallInput, TCallOutput>,
  options?: QueryBuilderOptions<TCallInput, TCallOutput>,
): QueryCall<TCallInput, TCallOutput, TSource> {
  if (options !== undefined) {
    if (isRecognizedSource(sourceOrDefinition)) {
      if (getSourceKind(sourceOrDefinition) !== undefined) {
        assertSourceKind(sourceOrDefinition, CALL_KINDS.query);
      }

      return createCall(
        CALL_KINDS.query,
        sourceOrDefinition as TSource,
        options,
      );
    }
  }

  if (
    sourceOrDefinition !== undefined &&
    isRecognizedSource(sourceOrDefinition)
  ) {
    if (getSourceKind(sourceOrDefinition) !== undefined) {
      assertSourceKind(sourceOrDefinition, CALL_KINDS.query);
    }

    return createCall(
      CALL_KINDS.query,
      sourceOrDefinition as TSource,
      undefined,
    );
  }

  if (sourceOrDefinition !== undefined && hasSourceShape(sourceOrDefinition)) {
    throwInvalidExplicitSource(sourceOrDefinition);
  }

  return createQueryCall(
    sourceOrDefinition as
      | QueryBuilderOptions<TCallInput, TCallOutput>
      | undefined,
  ) as QueryCall<TCallInput, TCallOutput, TSource>;
}

/**
 * Explicit call helper for write-like calls.
 */
export function mutation<TCallInput = unknown, TCallOutput = unknown>(
  options?: MutationBuilderOptions<TCallInput, TCallOutput>,
): MutationCall<TCallInput, TCallOutput, undefined>;
export function mutation<const TSource>(
  source: CompatibleSource<TSource, MutationKind>,
  options?: MutationBuilderOptions<
    CallSourceInputOf<TSource>,
    CallSourceOutputOf<TSource>
  >,
): MutationCall<
  CallSourceInputOf<TSource>,
  CallSourceOutputOf<TSource>,
  TSource
>;
export function mutation<
  TCallInput = unknown,
  TCallOutput = unknown,
  const TSource = undefined,
>(
  sourceOrDefinition?:
    | TSource
    | MutationBuilderOptions<TCallInput, TCallOutput>,
  options?: MutationBuilderOptions<TCallInput, TCallOutput>,
): MutationCall<TCallInput, TCallOutput, TSource> {
  if (options !== undefined) {
    if (isRecognizedSource(sourceOrDefinition)) {
      if (getSourceKind(sourceOrDefinition) !== undefined) {
        assertSourceKind(sourceOrDefinition, CALL_KINDS.mutation);
      }

      return createCall(
        CALL_KINDS.mutation,
        sourceOrDefinition as TSource,
        options,
      );
    }
  }

  if (
    sourceOrDefinition !== undefined &&
    isRecognizedSource(sourceOrDefinition)
  ) {
    if (getSourceKind(sourceOrDefinition) !== undefined) {
      assertSourceKind(sourceOrDefinition, CALL_KINDS.mutation);
    }

    return createCall(
      CALL_KINDS.mutation,
      sourceOrDefinition as TSource,
      undefined,
    );
  }

  if (sourceOrDefinition !== undefined && hasSourceShape(sourceOrDefinition)) {
    throwInvalidExplicitSource(sourceOrDefinition);
  }

  return createMutationCall(
    sourceOrDefinition as
      | MutationBuilderOptions<TCallInput, TCallOutput>
      | undefined,
  ) as MutationCall<TCallInput, TCallOutput, TSource>;
}
