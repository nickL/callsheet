import { CALL_KINDS, call, defineCalls } from 'callsheet';
import { call as tsRestCall } from 'callsheet/ts-rest';

import { calls as generatedCalls } from './generated/calls';
import { contract } from './rest/contract';

import type { CallsheetCustomSource } from 'callsheet';

export interface FeaturedCountResult {
  count: number;
}

const featuredCountSource: CallsheetCustomSource<
  void,
  FeaturedCountResult,
  typeof CALL_KINDS.query
> & {
  sourceId: 'sdk.featuredCount';
} = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'sdk.featuredCount',
};

export const calls = defineCalls({
  films: generatedCalls.films,
  sdk: {
    featuredCount: call(featuredCountSource, {
      dataKey: ['sdk', 'featuredCount'] as const,
    }),
  },
  users: {
    byId: tsRestCall(contract.users.byId, {
      dataKey: ({ input }) => ['user', input.params.id] as const,
    }),
  },
} as const);
