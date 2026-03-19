import { expectType } from 'tsd';

import { query } from '../src/index';

import type { Call, Key, QueryKind, Scope } from '../src/index';

const manualQuery = query<{ page: number }, { films: string[] }>({
  scope: ['films'] as const,
});

const staticScope = ['films'] as const satisfies Scope;
const staticKey = ['films', { page: 1 }] as const satisfies Key;

expectType<readonly ['films']>(staticScope);
expectType<readonly ['films', { readonly page: 1 }]>(staticKey);
expectType<Call<QueryKind, { page: number }, { films: string[] }, undefined>>(
  manualQuery,
);
