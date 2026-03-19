import { describe, expect, it } from 'vitest';

import {
  CALL_KINDS,
  GRAPHQL_OPERATION_KINDS,
  call,
  defineCalls,
  getCallMetadata,
  mutation,
  query,
} from '../../src';
import { getSourceKind, hasSourceShape } from '../../src/call-sources';

import type { RestSourceLike } from '../../src';

const OPERATION_DEFINITION_KIND = 'OperationDefinition' as const;

const filmsListDocument = {
  definitions: [
    {
      kind: OPERATION_DEFINITION_KIND,
      operation: GRAPHQL_OPERATION_KINDS.query,
    },
  ],
};

const filmFieldsFragmentDocument = {
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: {
        value: 'FilmFields',
      },
    },
  ],
};

const updateFilmRoute = {
  method: 'PATCH',
  path: '/films/:id',
} as const satisfies RestSourceLike<'PATCH'>;

const optionsRoute = {
  method: 'OPTIONS',
  path: '/films',
} as const satisfies RestSourceLike<'OPTIONS'>;

const sdkQuerySource = {
  callsheetKind: CALL_KINDS.query,
  label: 'sdk-client',
};

const sdkMutationRouteLikeSource = {
  callsheetKind: CALL_KINDS.mutation,
  method: 'GET',
  path: '/sdk/films',
};

describe('defineCalls', () => {
  it('annotates call paths', () => {
    const calls = defineCalls({
      films: {
        create: mutation({
          invalidates: [['films']],
        }),
        list: query(),
        ignoredLeaf: 'not-a-call',
      },
    });

    expect(calls.films.create.kind).toBe(CALL_KINDS.mutation);
    expect(calls.films.list.kind).toBe(CALL_KINDS.query);
    expect(calls.films.list.scope).toEqual(['films', 'list']);
    expect(getCallMetadata(calls.films.list)).toEqual({
      path: ['films', 'list'],
    });
    expect(getCallMetadata(calls.films.ignoredLeaf)).toBeUndefined();
    expect(getCallMetadata('not-a-call')).toBeUndefined();
  });

  it('infers call kind from GraphQL documents and REST-like contracts at runtime', () => {
    const calls = defineCalls({
      films: {
        list: call(filmsListDocument, {
          scope: ['films'],
        }),
        update: call(updateFilmRoute, {
          invalidates: [['films']],
        }),
      },
    });

    expect(calls.films.list.kind).toBe(CALL_KINDS.query);
    expect(calls.films.update.kind).toBe(CALL_KINDS.mutation);
    expect(getCallMetadata(calls.films.update)?.path).toEqual([
      'films',
      'update',
    ]);

    const explicitQuery = query(filmsListDocument, {
      scope: ['films', 'explicit-list'],
    });
    expect(explicitQuery.kind).toBe(CALL_KINDS.query);
    expect(explicitQuery.source).toEqual(filmsListDocument);
    expect(explicitQuery.scope).toEqual(['films', 'explicit-list']);
  });

  it('requires explicit query or mutation calls when kind cannot be inferred', () => {
    expect(() => {
      call({
        source: 'sdk-client',
      });
    }).toThrow(
      'Unable to infer call kind from provided source. Use query(...) or mutation(...) to specify kind explicitly.',
    );

    expect(() => {
      call(optionsRoute);
    }).toThrow(
      'Unable to infer call kind from provided source. Use query(...) or mutation(...) to specify kind explicitly.',
    );

    const optionsQuery = query(optionsRoute);
    expect(optionsQuery.kind).toBe(CALL_KINDS.query);
    expect(optionsQuery.source).toEqual(optionsRoute);

    const optionsQueryWithConfig = query(optionsRoute, {
      scope: ['films', 'options'],
    });
    expect(optionsQueryWithConfig.kind).toBe(CALL_KINDS.query);
    expect(optionsQueryWithConfig.source).toEqual(optionsRoute);
    expect(optionsQueryWithConfig.scope).toEqual(['films', 'options']);

    const optionsMutation = mutation(optionsRoute, {
      invalidates: [['films']],
    });
    expect(optionsMutation.kind).toBe(CALL_KINDS.mutation);
    expect(optionsMutation.source).toEqual(optionsRoute);

    const optionsMutationWithoutConfig = mutation(optionsRoute);
    expect(optionsMutationWithoutConfig.kind).toBe(CALL_KINDS.mutation);
    expect(optionsMutationWithoutConfig.source).toEqual(optionsRoute);
  });

  it('preserves custom sources in explicit query calls', () => {
    const sdkCall = query(sdkQuerySource);

    expect(sdkCall.kind).toBe(CALL_KINDS.query);
    expect(sdkCall.source).toEqual(sdkQuerySource);
  });

  it('preserves source-backed mutation calls', () => {
    const updateCall = mutation(updateFilmRoute);

    expect(updateCall.kind).toBe(CALL_KINDS.mutation);
    expect(updateCall.source).toEqual(updateFilmRoute);
  });

  it('treats callsheetKind as authoritative for custom sources', () => {
    const sdkCall = call(sdkMutationRouteLikeSource);

    expect(sdkCall.kind).toBe(CALL_KINDS.mutation);
    expect(sdkCall.source).toEqual(sdkMutationRouteLikeSource);
  });

  it('rejects explicit query or mutation calls when the source kind conflicts', () => {
    expect(() => {
      query({
        definitions: [
          {
            kind: OPERATION_DEFINITION_KIND,
            operation: GRAPHQL_OPERATION_KINDS.mutation,
          },
        ],
      });
    }).toThrow(
      'The provided source resolves to a mutation call, but query(...) was used.',
    );

    expect(() => {
      mutation(
        {
          definitions: [
            {
              kind: OPERATION_DEFINITION_KIND,
              operation: GRAPHQL_OPERATION_KINDS.query,
            },
          ],
        },
        {
          invalidates: [['films']],
        },
      );
    }).toThrow(
      'The provided source resolves to a query call, but mutation(...) was used.',
    );

    expect(() => {
      mutation({
        definitions: [
          {
            kind: OPERATION_DEFINITION_KIND,
            operation: GRAPHQL_OPERATION_KINDS.query,
          },
        ],
      });
    }).toThrow(
      'The provided source resolves to a query call, but mutation(...) was used.',
    );
  });

  it('rejects GraphQL subscriptions in the core model', () => {
    expect(() => {
      query({
        definitions: [
          {
            kind: OPERATION_DEFINITION_KIND,
            operation: GRAPHQL_OPERATION_KINDS.subscription,
          },
        ],
      });
    }).toThrow(
      'Subscriptions are not supported by the core callsheet model yet.',
    );

    expect(() => {
      getSourceKind({
        definitions: [
          {
            kind: OPERATION_DEFINITION_KIND,
            operation: GRAPHQL_OPERATION_KINDS.subscription,
          },
        ],
      });
    }).toThrow(
      'Subscriptions are not supported by the core callsheet model yet.',
    );
  });

  it('rejects fragment-only GraphQL documents in explicit query or mutation calls', () => {
    expect(() => {
      query(filmFieldsFragmentDocument);
    }).toThrow(
      'GraphQL documents used with callsheet must contain a query or mutation operation definition.',
    );

    expect(() => {
      mutation(filmFieldsFragmentDocument);
    }).toThrow(
      'GraphQL documents used with callsheet must contain a query or mutation operation definition.',
    );

    expect(getSourceKind(filmFieldsFragmentDocument)).toBeUndefined();
  });

  it('rejects unsupported source shapes in explicit calls', () => {
    expect(() => {
      query({
        method: 'GET',
      } as unknown as RestSourceLike<'GET'>);
    }).toThrow('The provided source shape is not supported by callsheet.');

    expect(() => {
      mutation({
        path: '/films',
      } as unknown as RestSourceLike<'POST'>);
    }).toThrow('The provided source shape is not supported by callsheet.');

    expect(() => {
      query(
        {
          method: 'GET',
        } as unknown as RestSourceLike<'GET'>,
        {
          scope: ['films'],
        },
      );
    }).toThrow('The provided source shape is not supported by callsheet.');

    expect(() => {
      mutation(
        {
          path: '/films',
        } as unknown as RestSourceLike<'POST'>,
        {
          invalidates: [['films']],
        },
      );
    }).toThrow('The provided source shape is not supported by callsheet.');
  });

  it('only treats objects as source-like shapes', () => {
    expect(hasSourceShape('films')).toBe(false);
    expect(hasSourceShape(123)).toBe(false);
    expect(hasSourceShape({ path: '/films' })).toBe(true);
  });
});
