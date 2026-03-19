import { CALL_KINDS, GRAPHQL_OPERATION_KINDS, isCallKind } from './call-kind';

import type { CallKind, GraphQLOperationKind } from './call-kind';
import type { CallTypeTag } from './call-type-tag';

/**
 * Matches the shape of a standard `TypedDocumentNode` or compatible document.
 */
export interface GraphQLDocumentLike {
  definitions: readonly unknown[];
}

interface TypedDocumentTypeDecoration<
  TResult = unknown,
  TVariables = Record<string, never>,
> {
  __apiType?: (variables: TVariables) => TResult;
}

type NormalizeTypedDocumentVariables<TVariables> = [TVariables] extends [
  Record<string, never>,
]
  ? [Record<string, never>] extends [TVariables]
    ? void
    : TVariables
  : TVariables;

export type TypedDocumentLike<
  TResult = unknown,
  TVariables = Record<string, never>,
> = GraphQLDocumentLike & TypedDocumentTypeDecoration<TResult, TVariables>;

const HTTP_METHOD_KINDS = {
  DELETE: CALL_KINDS.mutation,
  GET: CALL_KINDS.query,
  HEAD: CALL_KINDS.query,
  OPTIONS: undefined,
  PATCH: CALL_KINDS.mutation,
  POST: CALL_KINDS.mutation,
  PUT: CALL_KINDS.mutation,
} as const;

type StandardHttpMethod = keyof typeof HTTP_METHOD_KINDS;
export type HttpMethod = StandardHttpMethod | Lowercase<StandardHttpMethod>;
const standardHttpMethods = Object.keys(
  HTTP_METHOD_KINDS,
) as StandardHttpMethod[];
const supportedHttpMethodValues = standardHttpMethods.flatMap<HttpMethod>(
  (method) => [method, method.toLowerCase() as Lowercase<StandardHttpMethod>],
);

const supportedHttpMethods = new Set<HttpMethod>(supportedHttpMethodValues);

/**
 * Minimal REST-like contract shape used for kind inference.
 */
export interface RestSourceLike<TMethod extends HttpMethod = HttpMethod> {
  method: TMethod;
  path: string;
}

/**
 * Escape hatch for SDKs/custom transports that want to use the model.
 */
export type CallsheetCustomSource<
  TCallInput = unknown,
  TCallOutput = unknown,
  TKind extends CallKind = CallKind,
> = CallTypeTag<TCallInput, TCallOutput> & {
  callsheetKind: TKind;
};

export type CallSourceInputOf<TSource> =
  TSource extends TypedDocumentTypeDecoration<infer _TResult, infer TVariables>
    ? NormalizeTypedDocumentVariables<TVariables>
    : TSource extends CallTypeTag<infer TCallInput, infer _TCallOutput>
      ? TCallInput
      : unknown;

export type CallSourceOutputOf<TSource> =
  TSource extends TypedDocumentTypeDecoration<infer TResult, infer _TVariables>
    ? TResult
    : TSource extends CallTypeTag<infer _TCallInput, infer TCallOutput>
      ? TCallOutput
      : unknown;

export type HttpMethodToCallKind<TMethod extends HttpMethod> =
  Uppercase<TMethod> extends StandardHttpMethod
    ? (typeof HTTP_METHOD_KINDS)[Uppercase<TMethod>] extends CallKind
      ? (typeof HTTP_METHOD_KINDS)[Uppercase<TMethod>]
      : CallKind
    : CallKind;

export type CallSourceKindOf<TSource> =
  TSource extends CallsheetCustomSource<
    unknown,
    unknown,
    infer TKind extends CallKind
  >
    ? TKind
    : TSource extends RestSourceLike<infer TMethod extends HttpMethod>
      ? HttpMethodToCallKind<TMethod>
      : CallKind;

export type CompatibleSource<TSource, TExpectedKind extends CallKind> =
  Extract<CallSourceKindOf<TSource>, TExpectedKind> extends never
    ? never
    : TSource;

interface OperationDefinitionLike {
  kind: typeof OPERATION_DEFINITION_KIND;
  operation: GraphQLOperationKind;
}

const OPERATION_DEFINITION_KIND = 'OperationDefinition' as const;
const supportedGraphQLOperations = Object.values(GRAPHQL_OPERATION_KINDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGraphQLOperationDefinition(
  value: unknown,
): value is OperationDefinitionLike {
  return (
    isRecord(value) &&
    value.kind === OPERATION_DEFINITION_KIND &&
    typeof value.operation === 'string' &&
    supportedGraphQLOperations.includes(value.operation as GraphQLOperationKind)
  );
}

function isHttpMethod(value: unknown): value is HttpMethod {
  return (
    typeof value === 'string' && supportedHttpMethods.has(value as HttpMethod)
  );
}

export function isGraphQLDocumentLike(
  value: unknown,
): value is GraphQLDocumentLike {
  return isRecord(value) && Array.isArray(value.definitions);
}

export function isRestSourceLike(value: unknown): value is RestSourceLike {
  return (
    isRecord(value) &&
    isHttpMethod(value.method) &&
    typeof value.path === 'string'
  );
}

export function isCallsheetCustomSource(
  value: unknown,
): value is CallsheetCustomSource {
  return isRecord(value) && isCallKind(value.callsheetKind);
}

function inferGraphQLOperationKind(
  source: GraphQLDocumentLike,
): GraphQLOperationKind | undefined {
  for (const definition of source.definitions) {
    if (isGraphQLOperationDefinition(definition)) {
      return definition.operation;
    }
  }

  return undefined;
}

function inferRestCallKind(source: RestSourceLike): CallKind | undefined {
  return HTTP_METHOD_KINDS[source.method.toUpperCase() as StandardHttpMethod];
}

export function getSourceKind(source: unknown): CallKind | undefined {
  if (isCallsheetCustomSource(source)) {
    return source.callsheetKind;
  }

  if (isGraphQLDocumentLike(source)) {
    const graphQLOperationKind = inferGraphQLOperationKind(source);

    if (graphQLOperationKind === GRAPHQL_OPERATION_KINDS.subscription) {
      throw new Error(
        'Subscriptions are not supported by the core callsheet model yet.',
      );
    }

    if (graphQLOperationKind) {
      return graphQLOperationKind;
    }
  }

  if (isRestSourceLike(source)) {
    return inferRestCallKind(source);
  }

  return undefined;
}

export function inferCallKind(source: unknown): CallKind {
  const kind = getSourceKind(source);

  if (kind) {
    return kind;
  }

  throw new Error(
    'Unable to infer call kind from provided source. Use query(...) or mutation(...) to specify kind explicitly.',
  );
}

export function assertSourceKind(
  source: unknown,
  expectedKind: CallKind,
): void {
  const actualKind = inferCallKind(source);

  if (actualKind !== expectedKind) {
    throw new Error(
      `The provided source resolves to a ${actualKind} call, but ${expectedKind}(...) was used.`,
    );
  }
}

export function isRecognizedSource(value: unknown): boolean {
  if (isCallsheetCustomSource(value)) {
    return true;
  }

  if (isGraphQLDocumentLike(value)) {
    const graphQLOperationKind = inferGraphQLOperationKind(value);

    if (graphQLOperationKind === GRAPHQL_OPERATION_KINDS.subscription) {
      throw new Error(
        'Subscriptions are not supported by the core callsheet model yet.',
      );
    }

    return graphQLOperationKind !== undefined;
  }

  return isRestSourceLike(value);
}

export function hasSourceShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    'callsheetKind' in value ||
    'definitions' in value ||
    'method' in value ||
    'path' in value
  );
}
