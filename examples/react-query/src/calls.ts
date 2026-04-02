import {
  CALL_KINDS,
  call,
  defineCalls,
  type CallsheetCustomSource,
} from '@callsheet/react-query';
import { query as tsRestQuery } from '@callsheet/ts-rest';

import { calls as generatedCalls } from './generated/calls';
import { contract } from './rest/contract';

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
  ...generatedCalls,
  rest: {
    users: {
      byId: tsRestQuery(contract.users.byId, {
        family: ['rest', 'users', 'detail'] as const,
      }),
    },
  },
  sdk: {
    featuredCount: call(featuredCountSource, {
      family: ['sdk', 'featuredCount'] as const,
    }),
  },
} as const);
