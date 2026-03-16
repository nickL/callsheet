import { expectType } from 'tsd';

import {
  CALL_KINDS,
  GRAPHQL_OPERATION_KINDS,
  mutation,
  query,
} from '../src/index';

import type {
  CallInputOf,
  CallKindOf,
  CallOutputOf,
  CallsheetCustomSource,
  TypedDocumentLike,
} from '../src/index';

const OPERATION_DEFINITION_KIND = 'OperationDefinition' as const;

const filmsListDocument: TypedDocumentLike<
  { films: string[] },
  { page: number }
> = {
  definitions: [
    {
      kind: OPERATION_DEFINITION_KIND,
      operation: GRAPHQL_OPERATION_KINDS.query,
    },
  ],
};

const updateFilmDocument: TypedDocumentLike<
  { updateFilm: { id: string } },
  { id: string }
> = {
  definitions: [
    {
      kind: OPERATION_DEFINITION_KIND,
      operation: GRAPHQL_OPERATION_KINDS.mutation,
    },
  ],
};

const listCall = query(filmsListDocument, {
  dataKey: ({ input }) => ['films', input.page] as const,
});

const updateCall = mutation(updateFilmDocument, {
  invalidates: ({ input, output }) =>
    [['films'], ['film', input.id, output.updateFilm.id]] as const,
});

const manualQuery = query<{ page: number }, { films: string[] }>({
  dataKey: ({ input }) => ['films', input.page] as const,
});

const manualMutation = mutation<{ id: string }, { ok: true }>({
  invalidates: ({ input, output }) => [['film', input.id, output.ok]] as const,
});

void listCall;
void updateCall;
void manualQuery;
void manualMutation;

expectType<typeof CALL_KINDS.query>({} as CallKindOf<typeof listCall>);
expectType<typeof CALL_KINDS.mutation>({} as CallKindOf<typeof updateCall>);
expectType<{ page: number }>({} as CallInputOf<typeof manualQuery>);
expectType<{ films: string[] }>({} as CallOutputOf<typeof manualQuery>);
expectType<{ id: string }>({} as CallInputOf<typeof manualMutation>);
expectType<{ ok: true }>({} as CallOutputOf<typeof manualMutation>);

// @ts-expect-error explicit query calls reject sources typed as mutations
query({
  callsheetKind: CALL_KINDS.mutation,
} as CallsheetCustomSource<
  { id: string },
  { ok: true },
  typeof CALL_KINDS.mutation
>);
