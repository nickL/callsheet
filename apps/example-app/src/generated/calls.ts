import { defineCalls, mutation, query } from 'callsheet';
import { query as query_2 } from 'callsheet/ts-rest';
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
      byId: query_2(contract.users.byId),
    },
  },
} as const);
