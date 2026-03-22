export {
  defineCalls,
  getCallMetadata,
  CALL_KINDS,
  GRAPHQL_OPERATION_KINDS,
} from '@callsheet/core';
export { call, mutation, query } from './builders';

export type {
  Call,
  CallInputContext,
  CallInputOf,
  CallKindOf,
  CallKind,
  CallMetadata,
  CallOptions,
  CallOutputOf,
  CallSourceOf,
  CallsheetCustomSource,
  GraphQLOperationKind,
  HttpMethod,
  InvalidationConfig,
  InvalidationResolver,
  Key,
  KeyConfig,
  KeyContext,
  KeyPart,
  KeyResolver,
  MutationCall,
  MutationKind,
  MutationResultContext,
  QueryCall,
  QueryKind,
  RestSourceLike,
  Scope,
  ScopePart,
  SubscriptionOperationKind,
  TypedDocumentLike,
} from '@callsheet/core';
export type {
  MutationDefinitionOptions,
  QueryDefinitionOptions,
} from './definition-options';

export {
  createReactQueryAdapter,
  CallsheetProvider,
  queryOptions,
  useMutation,
  useQuery,
  useReactQueryAdapter,
} from '@callsheet/core/react-query';

export type {
  CallsheetProviderProps,
  ExecuteCall,
  ExecuteCallContext,
  MutationCallOptions,
  ReactQueryAdapter,
  ReactQueryAdapterConfig,
  ResolvedMutationOptions,
  ResolvedQueryOptions,
} from '@callsheet/core/react-query';

export type {
  QueryConfig as ReactQueryQueryConfig,
  QueryConfigWithInitialData as ReactQueryQueryConfigWithInitialData,
  QueryOptions as ReactQueryQueryOptions,
  QueryOptionsWithInitialData as ReactQueryQueryOptionsWithInitialData,
} from '@callsheet/core/react-query';
