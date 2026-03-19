import type {
  FilmByIdQueryVariables,
  RefreshFilmsMutation,
} from '../graphql/generated';
import type { MutationOptions, QueryOptions } from 'callsheet';

export const featuredFilmsOptions: QueryOptions<void> = {
  dataKey: ['films', 'featured'] as const,
};

export const filmByIdOptions: QueryOptions<FilmByIdQueryVariables> = {
  dataKey: ({ input }) => ['film', input.id] as const,
};

export const refreshFilmsOptions: MutationOptions<void, RefreshFilmsMutation> =
  {
    invalidates: [
      ['films', 'featured'],
      ['sdk', 'featuredCount'],
    ] as const,
  };
