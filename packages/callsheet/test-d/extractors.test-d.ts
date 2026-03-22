import { expectType } from 'tsd';

import { query } from '../src/index';

import type { Call, Key, QueryKind, Family } from '../src/index';

const manualQuery = query<{ page: number }, { films: string[] }>({
  family: ['films'] as const,
});

const staticFamily = ['films'] as const satisfies Family;
const staticKey = ['films', { page: 1 }] as const satisfies Key;

expectType<readonly ['films']>(staticFamily);
expectType<readonly ['films', { readonly page: 1 }]>(staticKey);
expectType<Call<QueryKind, { page: number }, { films: string[] }, undefined>>(
  manualQuery,
);
