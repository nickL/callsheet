import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
} from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import type { MutationKind } from '../call-kind';
import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type { MutationCallOptions, ReactQueryAdapter } from './adapter';
import type {
  QueryCallLike,
  QueryConfig,
  QueryConfigWithInitialData,
  QueryConfigWithoutInitialData,
} from './query-options';
import type {
  DefaultError,
  DefinedUseQueryResult,
  QueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

type MutationCallLike = CallTypeTag<unknown, unknown> & {
  kind: MutationKind;
};

const callsheetAdapterContext = createContext<ReactQueryAdapter | null>(null);

export interface CallsheetProviderProps extends PropsWithChildren {
  adapter: ReactQueryAdapter;
}

export function CallsheetProvider({
  adapter,
  children,
}: CallsheetProviderProps) {
  return (
    <callsheetAdapterContext.Provider value={adapter}>
      {children}
    </callsheetAdapterContext.Provider>
  );
}

export function useReactQueryAdapter(): ReactQueryAdapter {
  const adapter = useContext(callsheetAdapterContext);

  if (adapter) {
    return adapter;
  }

  throw new Error(
    'Wrap your tree in <CallsheetProvider> to use Callsheet React Query hooks.',
  );
}

type QueryResult<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> =
  | UseQueryResult<TSelected, DefaultError>
  | DefinedUseQueryResult<TSelected, DefaultError>;

export function useQuery<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
>(
  config: QueryConfigWithInitialData<TCall, TSelected>,
  queryClient?: QueryClient,
): DefinedUseQueryResult<TSelected, DefaultError>;
export function useQuery<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
>(
  config: QueryConfigWithoutInitialData<TCall, TSelected>,
  queryClient?: QueryClient,
): UseQueryResult<TSelected, DefaultError>;
export function useQuery<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
>(
  config: QueryConfig<TCall, TSelected>,
  queryClient?: QueryClient,
): QueryResult<TCall, TSelected> {
  const adapter = useReactQueryAdapter();

  return useTanstackQuery(adapter.resolveQueryOptions(config), queryClient);
}

export function useMutation<
  TCall extends MutationCallLike,
  TOnMutateResult = unknown,
>(
  call: TCall,
  options?: MutationCallOptions<TCall, TOnMutateResult>,
  queryClient?: QueryClient,
): UseMutationResult<
  CallOutputOf<TCall>,
  DefaultError,
  CallInputOf<TCall>,
  TOnMutateResult
> {
  const adapter = useReactQueryAdapter();

  return useTanstackMutation(
    adapter.mutationOptions(call, options),
    queryClient,
  );
}
