import { defineCalls, mutation, query } from 'callsheet';

import {
  FeaturedFilmsDocument,
  FilmByIdDocument,
  RefreshFilmsDocument,
} from '../graphql/documents';

export const calls = defineCalls({
  films: {
    byId: query(FilmByIdDocument, {
      dataKey: ({ input }: { input: { id: string } }) =>
        ['film', input.id] as const,
    }),
    featured: query(FeaturedFilmsDocument, {
      dataKey: ['films', 'featured'] as const,
    }),
    refresh: mutation(RefreshFilmsDocument),
  },
} as const);
