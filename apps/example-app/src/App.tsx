import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CallsheetProvider,
  createReactQueryAdapter,
  queryOptions,
  useQuery,
} from 'callsheet/react-query';

import { calls } from './generated/calls';

import type {
  FeaturedFilmsResult,
  FilmByIdInput,
  FilmByIdResult,
  RefreshFilmsResult,
} from './graphql/documents';
import type { ExecuteCall } from 'callsheet/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

type ExampleRequest =
  | {
      call: typeof calls.films.featured;
      input: void;
    }
  | {
      call: typeof calls.films.byId;
      input: FilmByIdInput;
    }
  | {
      call: typeof calls.films.refresh;
      input: void;
    };

const execute = ((request: ExampleRequest) => {
  if (request.call === calls.films.featured) {
    const featuredFilms: FeaturedFilmsResult = {
      films: ['Wall-E', 'Inside Out'],
    };

    return Promise.resolve(featuredFilms);
  }

  if (request.call === calls.films.byId && request.input !== undefined) {
    const filmId = request.input.id;
    const film: FilmByIdResult = {
      film: {
        id: filmId,
        title: filmId === 'wall-e' ? 'Wall-E' : 'Inside Out',
      },
    };

    return Promise.resolve(film);
  }

  if (request.call === calls.films.refresh) {
    const result: RefreshFilmsResult = {
      refreshed: true,
    };

    return Promise.resolve(result);
  }

  throw new Error('Unknown call');
}) as ExecuteCall;

const adapter = createReactQueryAdapter({
  execute,
});

function FeaturedFilmsSection() {
  const featuredFilms = useQuery(
    queryOptions(calls.films.featured, {
      select: (data) => data.films,
      staleTime: 30_000,
    }),
  );
  const wallE = useQuery(
    queryOptions(calls.films.byId, {
      input: { id: 'wall-e' },
      select: (data) => data.film,
    }),
  );

  if (featuredFilms.isPending || wallE.isPending) {
    return <p>Loading example data...</p>;
  }

  if (featuredFilms.isError || wallE.isError) {
    return <p>Example data failed to load.</p>;
  }

  return (
    <>
      <p data-testid="featured-call-kind">{calls.films.featured.kind}</p>
      <p data-testid="featured-call-data-key">
        {Array.isArray(calls.films.featured.dataKey)
          ? calls.films.featured.dataKey.join('.')
          : 'dynamic'}
      </p>
      <p data-testid="film-call-data-key">
        {typeof calls.films.byId.dataKey === 'function' ? 'dynamic' : 'static'}
      </p>
      <p data-testid="selected-film">{wallE.data.title}</p>
      <ul>
        {featuredFilms.data.map((filmTitle) => (
          <li key={filmTitle}>{filmTitle}</li>
        ))}
      </ul>
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CallsheetProvider adapter={adapter}>
        <main>
          <h1>Callsheet</h1>
          <FeaturedFilmsSection />
        </main>
      </CallsheetProvider>
    </QueryClientProvider>
  );
}
