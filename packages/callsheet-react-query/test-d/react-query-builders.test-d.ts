import { initContract } from '@ts-rest/core';
import { expectType } from 'tsd';

import { CALL_KINDS, call, mutation, query } from '../dist/index.js';

import type {
  CallInputOf,
  CallKindOf,
  CallOutputOf,
  CallSourceOf,
  CallsheetCustomSource,
  MutationDefinitionOptions,
  QueryDefinitionOptions,
  TypedDocumentLike,
} from '../dist/index.js';

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

const filmByIdSource: CallsheetCustomSource<
  { id: string },
  { film: { id: string; title: string } },
  typeof CALL_KINDS.query
> & { sourceId: 'films.byId' } = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.byId',
};

const updateFilmSource: CallsheetCustomSource<
  { id: string; title: string },
  { updateFilm: { id: string; title: string } },
  typeof CALL_KINDS.mutation
> & { sourceId: 'films.update' } = {
  callsheetKind: CALL_KINDS.mutation,
  sourceId: 'films.update',
};

const generatedFeaturedDocument: TypedDocumentLike<
  { films: readonly string[] },
  Record<string, never>
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
    },
  ],
};

const filmByIdOptions: QueryDefinitionOptions<
  { id: string },
  { film: { id: string; title: string } }
> = {
  retry: 1,
  family: ['films', 'detail'] as const,
  staleTime: 30_000,
  throwOnError: true,
};

const updateFilmOptions: MutationDefinitionOptions<
  { id: string; title: string },
  { updateFilm: { id: string; title: string } }
> = {
  invalidates: [['films', 'detail']] as const,
  mutationKey: ['films', 'update'],
  onError: () => {},
  retry: 1,
  throwOnError: true,
};

const byIdCall = call(filmByIdSource, filmByIdOptions);
const generatedFeaturedCall = query(generatedFeaturedDocument, {
  family: ['films', 'list'] as const,
  queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
  staleTime: 30_000,
});
const tsRestByIdCall = query(contract.films.byId, {
  family: ['films', 'detail'] as const,
  staleTime: 30_000,
});
const updateCall = mutation(updateFilmSource, updateFilmOptions);
const tsRestUpdateCall = mutation(contract.films.update, {
  invalidates: [['films', 'detail']] as const,
  retry: 1,
});

expectType<{ film: { id: string; title: string } }>(
  {} as CallOutputOf<typeof byIdCall>,
);
expectType<typeof CALL_KINDS.query>({} as CallKindOf<typeof tsRestByIdCall>);
expectType<typeof CALL_KINDS.mutation>(
  {} as CallKindOf<typeof tsRestUpdateCall>,
);
expectType<typeof contract.films.byId>(
  {} as CallSourceOf<typeof tsRestByIdCall>,
);
expectType<string>({} as CallInputOf<typeof tsRestByIdCall>['params']['id']);
expectType<string>({} as CallInputOf<typeof updateCall>['id']);
expectType<true>({} as CallOutputOf<typeof tsRestUpdateCall>['updated']);
expectType<readonly string[]>(
  {} as CallOutputOf<typeof generatedFeaturedCall>['films'],
);

// @ts-expect-error select should stay local in queryOptions/useQuery
query(generatedFeaturedDocument, {
  select: (data: { films: readonly string[] }) => data.films,
});

// @ts-expect-error enabled should stay local in queryOptions/useQuery
query(generatedFeaturedDocument, {
  enabled: false,
});

// @ts-expect-error initialData should stay local in queryOptions/useQuery
query(generatedFeaturedDocument, {
  initialData: {
    films: [],
  },
});

// @ts-expect-error queryKey is Callsheet-owned
query(generatedFeaturedDocument, {
  queryKey: ['films'],
});

// @ts-expect-error onSuccess stays local because Callsheet needs to handle invalidations
mutation(updateFilmSource, {
  onSuccess: () => {},
});

mutation(updateFilmSource, {
  scope: {
    id: 'films.update',
  },
});
