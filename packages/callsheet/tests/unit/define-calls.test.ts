import { describe, expect, it } from 'vitest';

import { defineCalls, mutation, query } from '../../src';

describe('defineCalls', () => {
  it('returns the provided call map unchanged', () => {
    const calls = defineCalls({
      films: {
        create: mutation({
          requiresAuth: true,
        }),
        list: query({
          cacheScope: ['films'],
        }),
      },
    });

    expect(calls.films.create.kind).toBe('mutation');
    expect(calls.films.create.requiresAuth).toBe(true);
    expect(calls.films.list.kind).toBe('query');
    expect(calls.films.list.cacheScope).toEqual(['films']);
  });
});
