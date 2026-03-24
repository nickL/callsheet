import {
  CallsheetProvider,
  createReactQueryAdapter,
  queryOptions,
  useMutation,
  useQuery,
  type ExecuteCall,
} from '@callsheet/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { calls } from './calls';

import type { FeaturedCountResult } from './calls';
import type {
  FeaturedFilmsQuery,
  FilmByIdQuery,
  FilmByIdQueryVariables,
  RefreshFilmsMutation,
} from './graphql/generated';
import type { UserByIdInput, UserByIdResult } from './rest/contract';

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
      input: FilmByIdQueryVariables;
    }
  | {
      call: typeof calls.films.refresh;
      input: void;
    }
  | {
      call: typeof calls.sdk.featuredCount;
      input: void;
    }
  | {
      call: typeof calls.rest.users.byId;
      input: UserByIdInput;
    };

function matchesCall<TCall extends ExampleRequest['call']>(
  request: ExampleRequest,
  call: TCall,
): request is Extract<ExampleRequest, { call: TCall }> {
  return request.call === call;
}

const exampleState = {
  featuredFilms: ['Wall-E', 'Inside Out'],
  users: {
    user_1: {
      id: 'user_1',
      name: 'Nick',
    },
  },
};

const execute = ((request: ExampleRequest) => {
  if (matchesCall(request, calls.films.featured)) {
    const featuredFilms: FeaturedFilmsQuery = {
      films: [...exampleState.featuredFilms],
    };

    return Promise.resolve(featuredFilms);
  }

  if (matchesCall(request, calls.films.byId)) {
    const input = request.input as FilmByIdQueryVariables;
    const filmId = input.id;
    const film: FilmByIdQuery = {
      film: {
        id: filmId,
        title: filmId === 'wall-e' ? 'Wall-E' : 'Inside Out',
      },
    };

    return Promise.resolve(film);
  }

  if (matchesCall(request, calls.films.refresh)) {
    const result: RefreshFilmsMutation = {
      refreshed: true,
    };

    if (!exampleState.featuredFilms.includes('Soul')) {
      exampleState.featuredFilms = [...exampleState.featuredFilms, 'Soul'];
    }

    return Promise.resolve(result);
  }

  if (matchesCall(request, calls.sdk.featuredCount)) {
    const result: FeaturedCountResult = {
      count: exampleState.featuredFilms.length,
    };

    return Promise.resolve(result);
  }

  if (matchesCall(request, calls.rest.users.byId)) {
    const userId = request.input.params.id;
    const user: UserByIdResult = {
      user: exampleState.users[userId as keyof typeof exampleState.users] ?? {
        id: userId,
        name: 'Unknown',
      },
    };

    return Promise.resolve(user);
  }

  throw new Error('Unknown call');
}) as ExecuteCall;

const adapter = createReactQueryAdapter({
  execute,
});

function FeaturedFilmsSection() {
  const featuredFilms = useQuery(
    queryOptions(calls.films.featured, {
      select: (data: FeaturedFilmsQuery) => data.films,
      staleTime: 30_000,
    }),
  );
  const wallE = useQuery(
    queryOptions(calls.films.byId, {
      input: { id: 'wall-e' },
      select: (data: FilmByIdQuery) => data.film,
    }),
  );
  const featuredCount = useQuery(
    queryOptions(calls.sdk.featuredCount, {
      select: (data) => data.count,
    }),
  );
  const user = useQuery(
    queryOptions(calls.rest.users.byId, {
      input: {
        params: {
          id: 'user_1',
        },
      },
      select: (data) => data.user,
    }),
  );
  const refresh = useMutation(calls.films.refresh);

  if (
    featuredFilms.isPending ||
    wallE.isPending ||
    featuredCount.isPending ||
    user.isPending
  ) {
    return <p>Loading example data...</p>;
  }

  if (
    featuredFilms.isError ||
    wallE.isError ||
    featuredCount.isError ||
    user.isError
  ) {
    return <p>Example data failed to load.</p>;
  }

  return (
    <>
      <p data-testid="featured-call-kind">{calls.films.featured.kind}</p>
      <p data-testid="featured-call-family">
        {calls.films.featured.family.join('.')}
      </p>
      <p data-testid="film-call-family">{calls.films.byId.family.join('.')}</p>
      <p data-testid="rest-call-family">
        {calls.rest.users.byId.family.join('.')}
      </p>
      <p data-testid="featured-count">{featuredCount.data}</p>
      <p data-testid="user-name">{user.data.name}</p>
      <p data-testid="selected-film">{wallE.data.title}</p>
      <button
        onClick={() => {
          refresh.mutate(undefined);
        }}
        type="button"
      >
        Refresh featured films
      </button>
      <ul>
        {featuredFilms.data.map((filmTitle: string) => (
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
