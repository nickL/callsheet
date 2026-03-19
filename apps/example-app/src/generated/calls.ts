import { defineCalls, mutation, query } from 'callsheet';
import {
  FeaturedFilmsDocument,
  FilmByIdDocument,
  RefreshFilmsDocument,
} from '../graphql/generated';
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
} as const);
