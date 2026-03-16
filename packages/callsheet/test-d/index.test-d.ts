import { expectType } from 'tsd';

import { defineCalls, mutation, query } from '../src/index';

const calls = defineCalls({
  films: {
    create: mutation({
      requiresAuth: true,
    }),
    list: query({
      cacheScope: ['films'],
    }),
  },
} as const);

expectType<'mutation'>(calls.films.create.kind);
expectType<true>(calls.films.create.requiresAuth);
expectType<'query'>(calls.films.list.kind);
expectType<readonly ['films']>(calls.films.list.cacheScope);
