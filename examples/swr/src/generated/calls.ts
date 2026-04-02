import { defineCalls, mutation, query } from '@callsheet/swr';
import {
  FeaturedFilmsDocument,
  FilmByIdDocument,
  RefreshFilmsDocument,
} from '../graphql/generated';
import { contract } from '../rest/contract';
import {
  featuredFilmsOptions,
  filmByIdOptions,
  refreshFilmsOptions,
} from '../callsheet-options/films';

export const calls = defineCalls({
  films: {
    byId: query(FilmByIdDocument, filmByIdOptions),
    featured: query(FeaturedFilmsDocument, featuredFilmsOptions),
    refresh: mutation(RefreshFilmsDocument, refreshFilmsOptions),
  },
  rest: {
    users: {
      byId: query(contract.users.byId),
    },
  },
} as const);
