import type {
  FilmByIdQueryVariables,
  RefreshFilmsMutation,
} from '../graphql/generated';
import type { MutationOptions, QueryOptions } from '@callsheet/react-query';

export const featuredFilmsOptions: QueryOptions<void> = {
  scope: ['films', 'list'] as const,
};

export const filmByIdOptions: QueryOptions<FilmByIdQueryVariables> = {
  scope: ['films', 'detail'] as const,
};

export const refreshFilmsOptions: MutationOptions<void, RefreshFilmsMutation> =
  {
    invalidates: [
      ['films', 'list'],
      ['sdk', 'featuredCount'],
    ] as const,
  };
