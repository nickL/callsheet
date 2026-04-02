import { expectType } from 'tsd';

import {
  buildSWRKey,
  extractFamilyFromSWRKey,
  extractIdentityFromSWRKey,
  getSWRAdapterConfig,
  isSWRCallKey,
  matchesFamilyInSWRKey,
  mutation,
  query,
  useMutation,
  usePreload,
  useQuery,
  useSWRAdapterConfig,
  useSWRMutation,
  useSWRPreload,
  useSWRQuery,
  withSWRConfig,
} from '../dist/index.js';

import type {
  ExecuteCall,
  ExecuteCallContext,
  ExecuteCallMiddleware,
  Family,
  MutationCallOptions,
  QueryCallOptions,
  SWRAdapterConfig,
  SWRCallKey,
  SWRKeyIdentity,
  TypedDocumentLike,
} from '../dist/index.js';
import type { Middleware } from 'swr';

const featuredFilmsDocument: TypedDocumentLike<
  { films: readonly string[] },
  Record<string, never>
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
    },
  ],
};

const updateFilmDocument: TypedDocumentLike<
  { film: { id: string; title: string } },
  { id: string; title: string }
> = {
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
    },
  ],
};

const featuredFilmsCall = query(featuredFilmsDocument, {
  family: ['films', 'list'] as const,
  revalidateOnFocus: false,
});

const updateFilmCall = mutation(updateFilmDocument, {
  family: ['films', 'detail'] as const,
  populateCache: true,
  revalidate: false,
});
const featuredNoInputCall = query<void, { films: readonly string[] }>();
const filmByIdCall = query<
  { id: string },
  { film: { id: string; title: string } }
>();
const middleware: Middleware = (useSWRNext) => (key, fetcher, config) =>
  useSWRNext(key, fetcher, config);

const queryOptions: QueryCallOptions<typeof featuredFilmsCall> = {
  revalidateOnMount: false,
};
const localSWRQueryOptions: QueryCallOptions<typeof filmByIdCall> = {
  input: { id: 'film_123' },
  isPaused: () => true,
  use: [middleware],
  compare: (left, right) => left?.film.id === right?.film.id,
  dedupingInterval: 1000,
  focusThrottleInterval: 250,
  loadingTimeout: 2000,
};

const disabledByIdOptions: QueryCallOptions<typeof filmByIdCall> = {
  enabled: false,
};

const mutationOptions: MutationCallOptions<typeof updateFilmCall> = {
  populateCache: false,
  revalidate: true,
};

declare const execute: ExecuteCall;
const executeMiddleware: ExecuteCallMiddleware = async (context, next) => {
  const withExecution = next({
    execution: {
      transportKey: context.key,
    },
  });

  const invalidExecuteOverrides: Parameters<typeof next>[0] =
    // @ts-expect-error execute middleware cannot replace the canonical key
    { key: context.key };

  void invalidExecuteOverrides;

  return withExecution;
};

const adapterConfig: SWRAdapterConfig = {
  execute,
  middleware: [executeMiddleware],
};

expectType<typeof useQuery>(useSWRQuery);
expectType<typeof useMutation>(useSWRMutation);
expectType<typeof usePreload>(useSWRPreload);
expectType<QueryCallOptions<typeof featuredFilmsCall>['revalidateOnMount']>(
  queryOptions.revalidateOnMount,
);
const maybeEnabled: QueryCallOptions<typeof filmByIdCall>['enabled'] =
  disabledByIdOptions.enabled;
expectType<QueryCallOptions<typeof filmByIdCall>['compare']>(
  localSWRQueryOptions.compare,
);
expectType<MutationCallOptions<typeof updateFilmCall>['revalidate']>(
  mutationOptions.revalidate,
);
expectType<Promise<{ film: { id: string; title: string } }>>(
  execute({} as ExecuteCallContext<typeof updateFilmCall>),
);

const swrConfig = withSWRConfig(
  {
    revalidateOnFocus: false,
  },
  adapterConfig,
);
const functionalSWRConfig = withSWRConfig((parentConfig) => ({
  revalidateOnFocus: parentConfig?.revalidateOnFocus ?? false,
}));
const explicitFunctionalSWRConfig = withSWRConfig(
  (parentConfig) => ({
    dedupingInterval: parentConfig?.dedupingInterval ?? 1000,
  }),
  adapterConfig,
);

expectType<boolean | undefined>(swrConfig.revalidateOnFocus);
expectType<boolean | undefined>(
  functionalSWRConfig({
    revalidateOnFocus: true,
  }).revalidateOnFocus,
);
expectType<number | undefined>(
  explicitFunctionalSWRConfig({
    dedupingInterval: 1000,
  }).dedupingInterval,
);
const filmByIdKey = buildSWRKey(filmByIdCall, { id: 'film_123' });
expectType<SWRCallKey>(filmByIdKey);
expectType<boolean>(isSWRCallKey(filmByIdKey));
expectType<Family | undefined>(extractFamilyFromSWRKey(filmByIdKey));
expectType<SWRKeyIdentity | undefined>(extractIdentityFromSWRKey(filmByIdKey));
expectType<boolean>(matchesFamilyInSWRKey(filmByIdKey, ['films']));
expectType<SWRAdapterConfig | undefined>(getSWRAdapterConfig(swrConfig));
expectType<typeof useSWRAdapterConfig>(useSWRAdapterConfig);
expectType<() => Promise<{ films: readonly string[] }>>(
  usePreload(featuredNoInputCall),
);
expectType<
  (input: { id: string }) => Promise<{ film: { id: string; title: string } }>
>(usePreload(filmByIdCall));
useQuery(filmByIdCall, {
  enabled: false,
});

expectType<{ film: { id: string; title: string } }>(
  useQuery(filmByIdCall, {
    input: { id: 'film_123' },
    fallbackData: {
      film: {
        id: 'film_123',
        title: 'Wall-E fallback',
      },
    },
  }).data,
);

expectType<{ film: { id: string; title: string } }>(
  useQuery(filmByIdCall, {
    input: { id: 'film_123' },
    suspense: true,
  }).data,
);

useQuery(filmByIdCall, {
  input: { id: 'film_123' },
  isPaused: () => true,
  use: [middleware],
  compare: (left, right) => left?.film.id === right?.film.id,
  dedupingInterval: 1000,
  focusThrottleInterval: 250,
  loadingTimeout: 2000,
});

expectType<Promise<{ film: { id: string; title: string } } | undefined>>(
  useMutation(updateFilmCall, {
    throwOnError: false,
  }).trigger({
    id: 'film_123',
    title: 'Inside Out',
  }),
);

expectType<Promise<{ film: { id: string; title: string } }>>(
  useMutation(updateFilmCall, {
    throwOnError: true,
  }).trigger({
    id: 'film_123',
    title: 'Inside Out',
  }),
);

// @ts-expect-error usePreload only supports query calls
usePreload(updateFilmCall);

// @ts-expect-error required input should still be provided when the query is enabled
useQuery(filmByIdCall, {});
// @ts-expect-error required input should still be provided when preloading an enabled query
usePreload(filmByIdCall)();
// @ts-expect-error no-input preload should not accept an input argument
usePreload(featuredNoInputCall)({ id: 'film_123' });
