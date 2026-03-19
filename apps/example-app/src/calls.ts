import { CALL_KINDS, call, defineCalls } from 'callsheet';

import { calls as generatedCalls } from './generated/calls';

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
  ...generatedCalls,
  sdk: {
    featuredCount: call(featuredCountSource, {
      scope: ['sdk', 'featuredCount'] as const,
    }),
  },
} as const);
