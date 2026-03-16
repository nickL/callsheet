export type CallKind = 'query' | 'mutation';

export type CallDefinition<
  TKind extends CallKind,
  TDefinition extends Record<string, unknown>,
> = Omit<TDefinition, 'kind'> & {
  kind: TKind;
};

export type QueryDefinition<TDefinition extends Record<string, unknown>> =
  CallDefinition<'query', TDefinition>;

export type MutationDefinition<TDefinition extends Record<string, unknown>> =
  CallDefinition<'mutation', TDefinition>;

export function query<const TDefinition extends Record<string, unknown>>(
  definition: TDefinition,
): QueryDefinition<TDefinition> {
  return {
    ...definition,
    kind: 'query',
  } as QueryDefinition<TDefinition>;
}

export function mutation<const TDefinition extends Record<string, unknown>>(
  definition: TDefinition,
): MutationDefinition<TDefinition> {
  return {
    ...definition,
    kind: 'mutation',
  } as MutationDefinition<TDefinition>;
}

export function defineCalls<const TCalls extends Record<string, unknown>>(
  calls: TCalls,
): TCalls {
  return calls;
}
