import { QueryClient } from '@tanstack/react-query';
import { expectType } from 'tsd';

import {
  CALL_KINDS,
  mutation,
  query,
  queryOptions,
  useMutation,
  useQuery,
} from '../dist/index.js';

import type {
  CallsheetCustomSource,
  MutationCallOptions,
  ReactQueryQueryConfig,
  ReactQueryQueryConfigWithInitialData,
  ReactQueryQueryOptions,
  TypedDocumentLike,
} from '../dist/index.js';

const featuredFilmsDocument: TypedDocumentLike<
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

const refreshFilmsDocument: TypedDocumentLike<
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

const filmByIdSource: CallsheetCustomSource<
  { id: string },
  { film: { id: string; title: string } },
  typeof CALL_KINDS.query
> & {
  sourceId: 'films.byId';
} = {
  callsheetKind: CALL_KINDS.query,
  sourceId: 'films.byId',
};

const updateFilmSource: CallsheetCustomSource<
  { id: string; title: string },
  { updateFilm: { id: string; title: string } },
  typeof CALL_KINDS.mutation
> & {
  sourceId: 'films.update';
} = {
  callsheetKind: CALL_KINDS.mutation,
  sourceId: 'films.update',
};

const featuredFilmsCall = query(featuredFilmsDocument, {
  family: ['films', 'list'] as const,
  staleTime: 30_000,
});
const filmByIdCall = query(filmByIdSource, {
  family: ['films', 'detail'] as const,
});
const updateFilmCall = mutation(updateFilmSource, {
  invalidates: [['films', 'detail']] as const,
  retry: 1,
});
const refreshFilmsCall = mutation(refreshFilmsDocument, {
  invalidates: [['films', 'list']] as const,
});

const featuredFilmsOptions: ReactQueryQueryOptions<typeof featuredFilmsCall> = {
  staleTime: 5_000,
};
const updateFilmOptions: MutationCallOptions<typeof updateFilmCall> = {
  retry: 2,
};
const byIdConfig: ReactQueryQueryConfig<typeof filmByIdCall, string> =
  queryOptions(filmByIdCall, {
    enabled: false,
    input: { id: 'film_123' },
    select: (data) => data.film.title,
  });
const byIdDisabledConfig: ReactQueryQueryConfig<typeof filmByIdCall> =
  queryOptions(filmByIdCall, {
    enabled: false,
  });
const byIdConfigWithInitialData: ReactQueryQueryConfigWithInitialData<
  typeof filmByIdCall,
  string
> = queryOptions(filmByIdCall, {
  input: { id: 'film_123' },
  initialData: {
    film: {
      id: 'film_123',
      title: 'Wall-E fallback',
    },
  },
  select: (data) => data.film.title,
});

expectType<ReactQueryQueryOptions<typeof featuredFilmsCall>['staleTime']>(
  featuredFilmsOptions.staleTime,
);
expectType<MutationCallOptions<typeof updateFilmCall>['retry']>(
  updateFilmOptions.retry,
);
expectType<{ films: readonly string[] } | undefined>(
  useQuery(queryOptions(featuredFilmsCall)).data,
);
expectType<{ film: { id: string; title: string } } | undefined>(
  useQuery(byIdDisabledConfig).data,
);
expectType<string | undefined>(useQuery(byIdConfig).data);
expectType<string>(useQuery(byIdConfigWithInitialData).data);
expectType<{ film: { id: string; title: string } } | undefined>(
  new QueryClient().getQueryData(byIdConfig.queryKey),
);
expectType<Promise<{ updateFilm: { id: string; title: string } }>>(
  useMutation(updateFilmCall).mutateAsync({
    id: 'film_123',
    title: 'Inside Out',
  }),
);
expectType<Promise<{ refreshed: boolean }>>(
  useMutation(refreshFilmsCall).mutateAsync(),
);

useMutation(refreshFilmsCall).mutate();
