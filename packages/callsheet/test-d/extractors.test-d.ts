import { expectType } from 'tsd';

import { query } from '../src/index';

import type { Call, DataKey, QueryKind } from '../src/index';

const manualQuery = query<{ page: number }, { films: string[] }>({
  dataKey: ({ input }) => ['films', input.page] as const,
});

const staticKey = ['films'] as const satisfies DataKey;

expectType<readonly ['films']>(staticKey);
expectType<Call<QueryKind, { page: number }, { films: string[] }, undefined>>(
  manualQuery,
);
