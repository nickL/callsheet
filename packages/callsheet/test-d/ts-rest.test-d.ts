import { initContract } from '@ts-rest/core';
import { expectType } from 'tsd';

import { CALL_KINDS } from '../dist/index.js';
import { call, mutation, query } from '../dist/ts-rest/index.js';

import type {
  CallInputOf,
  CallKindOf,
  CallOutputOf,
  CallSourceOf,
} from '../dist/index.js';

const c = initContract();

const contract = c.router({
  films: {
    byId: c.query({
      method: 'GET',
      path: '/films/:id',
      pathParams: c.type<{ id: string }>(),
      responses: {
        200: c.type<{ film: { id: string; title: string } }>(),
      },
    }),
    update: c.mutation({
      body: c.type<{ id: string; title: string }>(),
      method: 'PATCH',
      path: '/films/:id',
      pathParams: c.type<{ id: string }>(),
      responses: {
        200: c.type<{ updated: true }>(),
      },
    }),
  },
});

const byIdCall = call(contract.films.byId, {
  scope: ['films', 'detail'] as const,
});

const byIdQuery = query(contract.films.byId, {
  scope: ['films', 'detail'] as const,
});

const updateMutation = mutation(contract.films.update, {
  invalidates: [['films', 'detail']] as const,
});

expectType<{ film: { id: string; title: string } }>(
  {} as CallOutputOf<typeof byIdCall>,
);
expectType<typeof CALL_KINDS.query>({} as CallKindOf<typeof byIdQuery>);
expectType<typeof CALL_KINDS.mutation>({} as CallKindOf<typeof updateMutation>);
expectType<typeof contract.films.byId>({} as CallSourceOf<typeof byIdCall>);
expectType<string>({} as CallInputOf<typeof byIdCall>['params']['id']);
expectType<string>({} as CallInputOf<typeof updateMutation>['params']['id']);
expectType<string>({} as CallInputOf<typeof updateMutation>['body']['title']);

query(contract.films.byId, {
  // @ts-expect-error invalidates is only available on mutation calls
  invalidates: [['films']],
});

mutation(contract.films.update, {
  key: ({ input }) => ['film', { id: input.params.id }] as const,
  // @ts-expect-error select is only available on query calls
  select: (result) => result.updated,
});
