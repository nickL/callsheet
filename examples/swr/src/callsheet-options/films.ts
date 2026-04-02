import type {
  FeaturedFilmsQuery,
  FilmByIdQuery,
  FilmByIdQueryVariables,
  RefreshFilmsMutation,
} from '../graphql/generated';
import type {
  MutationDefinitionOptions,
  QueryDefinitionOptions,
} from '@callsheet/swr';

export const featuredFilmsOptions: QueryDefinitionOptions<
  void,
  FeaturedFilmsQuery
> = {
  family: ['films', 'list'] as const,
};

export const filmByIdOptions: QueryDefinitionOptions<
  FilmByIdQueryVariables,
  FilmByIdQuery
> = {
  family: ['films', 'detail'] as const,
};

export const refreshFilmsOptions: MutationDefinitionOptions<
  void,
  RefreshFilmsMutation
> = {
  invalidates: [
    ['films', 'list'],
    ['sdk', 'featuredCount'],
  ] as const,
};
