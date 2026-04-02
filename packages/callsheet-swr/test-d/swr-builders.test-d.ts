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
  { film: { id: string; title: string } },
  typeof CALL_KINDS.mutation
> & { sourceId: 'films.update' } = {
  callsheetKind: CALL_KINDS.mutation,
  sourceId: 'films.update',
};

const filmByIdOptions: QueryDefinitionOptions<
  { id: string },
  { film: { id: string; title: string } }
> = {
  family: ['films', 'detail'] as const,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 30_000,
  shouldRetryOnError: true,
};

const updateFilmOptions: MutationDefinitionOptions<
  { id: string; title: string },
  { film: { id: string; title: string } }
> = {
  family: ['films', 'detail'] as const,
  invalidates: [['films', 'detail']] as const,
  populateCache: true,
  revalidate: false,
};

const generatedFeaturedCall = query(generatedFeaturedDocument, {
  family: ['films', 'list'] as const,
  revalidateOnMount: true,
  refreshWhenHidden: true,
});

const manualFilmByIdCall = call(filmByIdSource, filmByIdOptions);
const filmByIdCall = query<
  { id: string },
  { film: { id: string; title: string } }
>(filmByIdOptions);
const updateFilmCall = mutation(updateFilmSource, updateFilmOptions);

expectType<typeof CALL_KINDS.query>(
  {} as CallKindOf<typeof generatedFeaturedCall>,
);
expectType<readonly string[]>(
  {} as CallOutputOf<typeof generatedFeaturedCall>['films'],
);
expectType<typeof filmByIdSource>(
  {} as CallSourceOf<typeof manualFilmByIdCall>,
);
expectType<string>({} as CallInputOf<typeof filmByIdCall>['id']);
expectType<string>({} as CallInputOf<typeof updateFilmCall>['id']);

query(generatedFeaturedDocument, {
  // @ts-expect-error fetcher stays owned by the adapter
  fetcher: async () => ({ films: [] }),
});

query(generatedFeaturedDocument, {
  // @ts-expect-error fallbackData should stay local
  fallbackData: {
    films: [],
  },
});

query(generatedFeaturedDocument, {
  // @ts-expect-error suspense should stay local
  suspense: true,
});

query(generatedFeaturedDocument, {
  // @ts-expect-error provider-level SWR config should not live on the call
  dedupingInterval: 1000,
});

mutation(updateFilmSource, {
  // @ts-expect-error onSuccess should stay local for useMutation
  onSuccess: () => {},
});

mutation(updateFilmSource, {
  // @ts-expect-error onError should stay local for useMutation
  onError: () => {},
});

mutation(updateFilmSource, {
  // @ts-expect-error throwOnError should stay local for useMutation
  throwOnError: false,
});

mutation(updateFilmSource, {
  // @ts-expect-error optimisticData should stay local for useMutation
  optimisticData: { film: { id: 'film_123', title: 'Inside Out' } },
});

mutation(updateFilmSource, {
  // @ts-expect-error rollbackOnError should stay local for useMutation
  rollbackOnError: true,
});
