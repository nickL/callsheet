import { initContract } from '@ts-rest/core';
import { describe, expect, it } from 'vitest';

import { CALL_KINDS, defineCalls, getCallMetadata } from '../../src';
import {
  call as tsRestCall,
  mutation as tsRestMutation,
  query as tsRestQuery,
} from '../../src/ts-rest';

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

describe('callsheet/ts-rest', () => {
  it('creates calls from ts-rest routes', () => {
    const calls = defineCalls({
      films: {
        byId: tsRestCall(contract.films.byId, {
          family: ['films', 'detail'] as const,
        }),
        update: tsRestCall(contract.films.update, {
          invalidates: [['films', 'detail']] as const,
        }),
      },
    });

    expect(calls.films.byId.kind).toBe(CALL_KINDS.query);
    expect(calls.films.update.kind).toBe(CALL_KINDS.mutation);
    expect(calls.films.byId.source).toBe(contract.films.byId);
    expect(calls.films.update.source).toBe(contract.films.update);
    expect(getCallMetadata(calls.films.byId)).toEqual({
      path: ['films', 'byId'],
    });
  });

  it('creates query and mutation calls with ts-rest wrappers', () => {
    const byId = tsRestQuery(contract.films.byId, {
      family: ['films', 'detail'] as const,
    });
    const update = tsRestMutation(contract.films.update, {
      invalidates: [['films', 'detail']] as const,
    });

    expect(byId.kind).toBe(CALL_KINDS.query);
    expect(update.kind).toBe(CALL_KINDS.mutation);
  });
});
