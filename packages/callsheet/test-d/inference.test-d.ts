import { expectType } from 'tsd';

import {
  CALL_KINDS,
  GRAPHQL_OPERATION_KINDS,
  call,
  defineCalls,
} from '../src/index';

import type {
  CallInputOf,
  CallKind,
  CallKindOf,
  CallOutputOf,
  CallSourceOf,
  CallsheetCustomSource,
  RestSourceLike,
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

const restRoute: CallsheetCustomSource<
  { params: { id: string } },
  { film: { id: string } },
  typeof CALL_KINDS.query
> & {
  method: RestSourceLike<'GET'>['method'];
  path: RestSourceLike<'GET'>['path'];
} = {
  callsheetKind: CALL_KINDS.query,
  method: 'GET',
  path: '/films/:id',
};

const calls = defineCalls({
  films: {
    byId: call(restRoute, {
      dataKey: ({ input }) => ['film', input.params.id] as const,
    }),
    list: call(filmsListDocument, {
      dataKey: ({ input }) => ['films', input.page] as const,
    }),
  },
});

void calls;

expectType<{ params: { id: string } }>(
  {} as CallInputOf<typeof calls.films.byId>,
);
expectType<{ film: { id: string } }>(
  {} as CallOutputOf<typeof calls.films.byId>,
);
expectType<typeof CALL_KINDS.query>({} as CallKindOf<typeof calls.films.byId>);
expectType<typeof restRoute>({} as CallSourceOf<typeof calls.films.byId>);

expectType<{ page: number }>({} as CallInputOf<typeof calls.films.list>);
expectType<{ films: string[] }>({} as CallOutputOf<typeof calls.films.list>);
expectType<CallKind>({} as CallKindOf<typeof calls.films.list>);

call(restRoute, {
  // @ts-expect-error query sources do not accept mutation invalidation config
  invalidates: [['films']],
});
