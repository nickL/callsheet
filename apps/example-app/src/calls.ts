import {
  CALL_KINDS,
  call,
  defineCalls,
  type CallsheetCustomSource,
} from '@callsheet/react-query';

import { calls as generatedCalls } from './generated/calls';

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
