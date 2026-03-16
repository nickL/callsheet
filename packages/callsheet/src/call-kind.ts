export const CALL_KINDS = {
  mutation: 'mutation',
  query: 'query',
} as const;

export type CallKind = (typeof CALL_KINDS)[keyof typeof CALL_KINDS];
export type QueryKind = typeof CALL_KINDS.query;
export type MutationKind = typeof CALL_KINDS.mutation;

export const GRAPHQL_OPERATION_KINDS = {
  ...CALL_KINDS,
  subscription: 'subscription',
} as const;

export type GraphQLOperationKind =
  (typeof GRAPHQL_OPERATION_KINDS)[keyof typeof GRAPHQL_OPERATION_KINDS];
export type SubscriptionOperationKind =
  typeof GRAPHQL_OPERATION_KINDS.subscription;

export function isCallKind(value: unknown): value is CallKind {
  return value === CALL_KINDS.query || value === CALL_KINDS.mutation;
}
