export {
  call,
  mutation,
  query,
  defineCalls,
  getCallMetadata,
  CALL_KINDS,
  GRAPHQL_OPERATION_KINDS,
} from '@callsheet/core';

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
  MutationOptions,
  MutationResultContext,
  QueryCall,
  QueryKind,
  QueryOptions,
  RestSourceLike,
  Scope,
  ScopePart,
  SubscriptionOperationKind,
  TypedDocumentLike,
} from '@callsheet/core';

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
