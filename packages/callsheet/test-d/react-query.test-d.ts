import { QueryClient } from '@tanstack/react-query';
import { expectType } from 'tsd';

import { CALL_KINDS, call, mutation, query } from '../dist/index.js';
import {
  createReactQueryAdapter,
  queryOptions,
  useMutation,
  useQuery,
} from '../dist/react-query/index.js';

import type {
  CallsheetCustomSource,
  Family,
  TypedDocumentLike,
} from '../dist/index.js';
import type {
  DefinedUseQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

const adapter = createReactQueryAdapter({
  execute: () => Promise.reject(new Error('not executed in type tests')),
});

const featuredSource: CallsheetCustomSource<
  void,
  { films: readonly string[] },
  typeof CALL_KINDS.query
> & { sourceId: 'films.featured' } = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.featured',
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
  { updateFilm: { id: string; title: string } },
  typeof CALL_KINDS.mutation
> & { sourceId: 'films.update' } = {
  callsheetKind: CALL_KINDS.mutation,
  sourceId: 'films.update',
};

const maybeFilmByIdSource: CallsheetCustomSource<
  { id: string } | undefined,
  { film: { id: string; title: string } },
  typeof CALL_KINDS.query
> & { sourceId: 'films.maybeById' } = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.maybeById',
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

const generatedRefreshDocument: TypedDocumentLike<
  { refreshed: boolean },
  Record<string, never>
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
    },
  ],
};

const featuredCall = call(featuredSource, {
  family: ['films', 'list'] as const,
});

const byIdCall = call(filmByIdSource, {
  family: ['films', 'detail'] as const,
});

const updateCall = call(updateFilmSource, {
  invalidates: [['films', 'detail']] as const,
});

const maybeByIdCall = call(maybeFilmByIdSource, {
  family: ['films', 'detail'] as const,
  key: ({ family, input }) => {
    expectType<Family>(family);

    return ['film', family[1], { id: input?.id ?? 'unknown' }] as const;
  },
});
const generatedFeaturedCall = query(generatedFeaturedDocument, {
  family: ['films', 'list'] as const,
});
const generatedRefreshCall = mutation(generatedRefreshDocument, {
  invalidates: [['films', 'list']] as const,
});

const featuredConfig = queryOptions(featuredCall, {
  select: (data) => data.films,
});
const byIdConfig = queryOptions(byIdCall, {
  input: { id: 'film_123' },
  select: (data) => data.film,
});
const byIdConfigWithInitialData = queryOptions(byIdCall, {
  input: { id: 'film_123' },
  initialData: {
    film: {
      id: 'film_123',
      title: 'Alien',
    },
  },
});

expectType<readonly string[] | undefined>(useQuery(featuredConfig).data);
expectType<UseQueryResult<readonly string[]>>(useQuery(featuredConfig));
expectType<UseQueryResult<{ id: string; title: string }>>(useQuery(byIdConfig));
expectType<DefinedUseQueryResult<{ film: { id: string; title: string } }>>(
  useQuery(byIdConfigWithInitialData),
);
expectType<
  UseMutationResult<
    { updateFilm: { id: string; title: string } },
    Error,
    { id: string; title: string },
    unknown
  >
>(useMutation(updateCall));
expectType<Promise<{ films: readonly string[] }>>(
  adapter.fetchQuery(new QueryClient(), queryOptions(featuredCall)),
);
expectType<Promise<{ films: readonly string[] }>>(
  adapter.fetchQuery(new QueryClient(), queryOptions(generatedFeaturedCall)),
);
expectType<UseMutationResult<{ refreshed: boolean }, Error, void, unknown>>(
  useMutation(generatedRefreshCall),
);
expectType<Promise<{ id: string; title: string }>>(
  adapter.fetchQuery(new QueryClient(), byIdConfig),
);

const resolvedByIdOptions = adapter.resolveQueryOptions(byIdConfig);

void resolvedByIdOptions.queryKey;
void resolvedByIdOptions.queryFn;
// @ts-expect-error query config should not expose queryKey
void byIdConfig.queryKey;
// @ts-expect-error query config should not expose input after materialization
void resolvedByIdOptions.input;
expectType<{ film: { id: string; title: string } } | undefined>(
  new QueryClient().getQueryData(resolvedByIdOptions.queryKey),
);

useMutation(updateCall).mutate({
  id: 'film_123',
  title: 'Alien 3',
});
useMutation(generatedRefreshCall).mutate(undefined);

const invalidByIdOptions = {
  select: (data: { film: { id: string; title: string } }) => data.film,
};

// @ts-expect-error input-bearing query calls require an `input` field
queryOptions(byIdCall, invalidByIdOptions);

// @ts-expect-error union-with-undefined inputs still require an `input` field
queryOptions(maybeByIdCall, {
  staleTime: 1_000,
});

queryOptions(maybeByIdCall, {
  input: undefined,
  staleTime: 1_000,
});

// @ts-expect-error mutation input is validated at mutate time
useMutation(updateCall).mutate({
  id: 'film_123',
});
