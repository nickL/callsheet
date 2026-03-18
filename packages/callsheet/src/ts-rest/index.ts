import {
  call as baseCall,
  mutation as baseMutation,
  query as baseQuery,
} from '../calls';

import type { QueryKind } from '../call-kind';
import type { CallSourceKindOf } from '../call-sources';
import type { CallTypeTag } from '../call-type-tag';
import type {
  CallOptionsForKind,
  MutationCall,
  QueryCall,
} from '../call-types';
import type {
  AppRoute,
  AppRouteDeleteNoBody,
  AppRouteMutation,
  AppRouteQuery,
  ClientInferRequest,
  ClientInferResponseBody,
  SuccessfulHttpStatusCode,
} from '@ts-rest/core';

type TsRestSuccessStatusCode<TRoute extends AppRoute> = Extract<
  keyof TRoute['responses'],
  SuccessfulHttpStatusCode
>;

export type TsRestRoute = AppRoute;

export type TsRestRouteInput<TRoute extends AppRoute> =
  ClientInferRequest<TRoute>;

export type TsRestRouteOutput<TRoute extends AppRoute> =
  ClientInferResponseBody<TRoute, TsRestSuccessStatusCode<TRoute>>;

type TsRestTypedRoute<TRoute extends AppRoute> = TRoute &
  CallTypeTag<TsRestRouteInput<TRoute>, TsRestRouteOutput<TRoute>>;

type TsRestCallOptions<TRoute extends AppRoute> = CallOptionsForKind<
  CallSourceKindOf<TRoute>,
  TsRestRouteInput<TRoute>,
  TsRestRouteOutput<TRoute>
>;

type TsRestMutationRoute = AppRouteMutation | AppRouteDeleteNoBody;

type TsRestCall<TRoute extends AppRoute> =
  CallSourceKindOf<TRoute> extends QueryKind
    ? QueryCall<TsRestRouteInput<TRoute>, TsRestRouteOutput<TRoute>, TRoute>
    : MutationCall<TsRestRouteInput<TRoute>, TsRestRouteOutput<TRoute>, TRoute>;

type TsRestQueryCall<TRoute extends AppRouteQuery> = QueryCall<
  TsRestRouteInput<TRoute>,
  TsRestRouteOutput<TRoute>,
  TRoute
>;

type TsRestMutationCall<TRoute extends TsRestMutationRoute> = MutationCall<
  TsRestRouteInput<TRoute>,
  TsRestRouteOutput<TRoute>,
  TRoute
>;

function withCallsheetTypes<TRoute extends AppRoute>(
  route: TRoute,
): TsRestTypedRoute<TRoute> {
  return route as TsRestTypedRoute<TRoute>;
}

const callRoute = baseCall as <const TRoute extends AppRoute>(
  route: TsRestTypedRoute<TRoute>,
  options?: TsRestCallOptions<TRoute>,
) => TsRestCall<TRoute>;

const queryRoute = baseQuery as <const TRoute extends AppRouteQuery>(
  route: TsRestTypedRoute<TRoute>,
  options?: TsRestCallOptions<TRoute>,
) => TsRestQueryCall<TRoute>;

const mutationRoute = baseMutation as <
  const TRoute extends TsRestMutationRoute,
>(
  route: TsRestTypedRoute<TRoute>,
  options?: TsRestCallOptions<TRoute>,
) => TsRestMutationCall<TRoute>;

export function call<const TRoute extends AppRoute>(
  route: TRoute,
  options?: TsRestCallOptions<TRoute>,
) {
  return callRoute(withCallsheetTypes(route), options);
}

export function query<const TRoute extends AppRouteQuery>(
  route: TRoute,
  options?: TsRestCallOptions<TRoute>,
): TsRestQueryCall<TRoute> {
  return queryRoute(withCallsheetTypes(route), options);
}

export function mutation<const TRoute extends TsRestMutationRoute>(
  route: TRoute,
  options?: TsRestCallOptions<TRoute>,
): TsRestMutationCall<TRoute> {
  return mutationRoute(withCallsheetTypes(route), options);
}
