import {
  useMutation,
  useQuery,
  withSWRConfig,
  type ExecuteCall,
} from '@callsheet/swr';
import { SWRConfig } from 'swr';

import { calls } from './calls';

import type { FeaturedCountResult } from './calls';
import type {
  FeaturedFilmsQuery,
  FilmByIdQuery,
  FilmByIdQueryVariables,
  RefreshFilmsMutation,
} from './graphql/generated';
import type { UserByIdInput, UserByIdResult } from './rest/contract';

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
    const input = request.input;
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
const swrCache = new Map();

function FeaturedFilmsSection() {
  const featuredFilms = useQuery(calls.films.featured);
  const wallE = useQuery(calls.films.byId, {
    input: { id: 'wall-e' },
  });
  const featuredCount = useQuery(calls.sdk.featuredCount);
  const user = useQuery(calls.rest.users.byId, {
    input: {
      params: {
        id: 'user_1',
      },
    },
  });
  const refresh = useMutation(calls.films.refresh);

  const isLoadingExampleData =
    featuredFilms.isLoading ||
    wallE.isLoading ||
    featuredCount.isLoading ||
    user.isLoading;

  if (isLoadingExampleData) {
    return <p>Loading example data...</p>;
  }

  const hasExampleDataError =
    featuredFilms.error !== undefined ||
    wallE.error !== undefined ||
    featuredCount.error !== undefined ||
    user.error !== undefined;

  if (hasExampleDataError) {
    return <p>Example data failed to load.</p>;
  }

  const featuredFilmsData = featuredFilms.data!;
  const wallEData = wallE.data!;
  const featuredCountData = featuredCount.data!;
  const userData = user.data!;

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
      <p data-testid="featured-count">{featuredCountData.count}</p>
      <p data-testid="user-name">{userData.user.name}</p>
      <p data-testid="selected-film">{wallEData.film.title}</p>
      <button
        onClick={() => {
          void refresh.trigger();
        }}
        type="button"
      >
        Refresh featured films
      </button>
      <ul>
        {featuredFilmsData.films.map((filmTitle: string) => (
          <li key={filmTitle}>{filmTitle}</li>
        ))}
      </ul>
    </>
  );
}

export function App() {
  return (
    <SWRConfig
      value={withSWRConfig(
        {
          provider: () => swrCache,
          revalidateOnFocus: false,
        },
        {
          execute,
        },
      )}
    >
      <main>
        <h1>Callsheet SWR</h1>
        <FeaturedFilmsSection />
      </main>
    </SWRConfig>
  );
}
