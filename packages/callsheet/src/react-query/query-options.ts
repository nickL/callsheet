import { buildQueryKey, type QueryCallKey } from './query-key';

import type { QueryKind } from '../call-kind';
import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type {
  DefaultError,
  DefinedInitialDataOptions as TanStackDefinedInitialDataOptions,
  QueryKey,
  UndefinedInitialDataOptions as TanStackUndefinedInitialDataOptions,
} from '@tanstack/react-query';

type NoInputLike = void | undefined;
const explicitInputKey = Symbol('callsheet.explicitInput');

export type QueryCallLike = CallTypeTag<unknown, unknown> & {
  kind: QueryKind;
};

type HasNoInput<TInput> = [TInput] extends [NoInputLike]
  ? [NoInputLike] extends [TInput]
    ? true
    : false
  : false;

type QueryInputField<TCall extends QueryCallLike> =
  HasNoInput<CallInputOf<TCall>> extends true
    ? {
        enabled?: boolean;
        input?: CallInputOf<TCall>;
      }
    :
        | {
            enabled?: boolean;
            input: CallInputOf<TCall>;
          }
        | {
            enabled: false;
            input?: CallInputOf<TCall>;
          };

type RequiredOptionsArg<TOptions> = [options: TOptions];
type OptionalOptionsArg<TOptions> = [options?: TOptions];

type QueryOptionsArgs<
  TCall extends QueryCallLike,
  TOptions,
  TAllowNoInputOmission extends boolean = true,
> =
  HasNoInput<CallInputOf<TCall>> extends true
    ? TAllowNoInputOmission extends true
      ? OptionalOptionsArg<TOptions>
      : RequiredOptionsArg<TOptions>
    : RequiredOptionsArg<TOptions>;

type QueryOptionsWithoutInitialData<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> = QueryInputField<TCall> &
  Omit<
    TanStackUndefinedInitialDataOptions<
      CallOutputOf<TCall>,
      DefaultError,
      TSelected,
      QueryKey
    >,
    'enabled' | 'queryFn' | 'queryKey'
  >;

export type QueryOptionsWithInitialData<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> = QueryInputField<TCall> &
  Omit<
    TanStackDefinedInitialDataOptions<
      CallOutputOf<TCall>,
      DefaultError,
      TSelected,
      QueryKey
    >,
    'enabled' | 'queryFn' | 'queryKey'
  >;

export type QueryOptions<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> =
  | QueryOptionsWithoutInitialData<TCall, TSelected>
  | QueryOptionsWithInitialData<TCall, TSelected>;

export type QueryConfigWithoutInitialData<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> = {
  call: TCall;
  queryKey: QueryCallKey<TCall>;
} & QueryOptionsWithoutInitialData<TCall, TSelected>;

export type QueryConfigWithInitialData<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> = {
  call: TCall;
  queryKey: QueryCallKey<TCall>;
} & QueryOptionsWithInitialData<TCall, TSelected>;

export type QueryConfig<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
> =
  | QueryConfigWithoutInitialData<TCall, TSelected>
  | QueryConfigWithInitialData<TCall, TSelected>;

interface QueryConfigInternal {
  [explicitInputKey]?: true;
}

export function hasExplicitInput<TCall extends QueryCallLike>(
  config: QueryConfig<TCall, unknown>,
): boolean {
  return explicitInputKey in (config as QueryConfigInternal);
}

export function queryOptions<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
>(
  call: TCall,
  ...args: QueryOptionsArgs<
    TCall,
    QueryOptionsWithInitialData<TCall, TSelected>,
    false
  >
): QueryConfigWithInitialData<TCall, TSelected>;
export function queryOptions<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
>(
  call: TCall,
  ...args: QueryOptionsArgs<
    TCall,
    QueryOptionsWithoutInitialData<TCall, TSelected>
  >
): QueryConfigWithoutInitialData<TCall, TSelected>;
export function queryOptions<
  TCall extends QueryCallLike,
  TSelected = CallOutputOf<TCall>,
>(
  call: TCall,
  ...args: QueryOptionsArgs<TCall, QueryOptions<TCall, TSelected>>
): QueryConfig<TCall, TSelected> {
  const [options] = args;
  const explicitInput = !!options && Object.hasOwn(options, 'input');
  const input = explicitInput
    ? (options.input as CallInputOf<TCall>)
    : undefined;
  const config = {
    call,
    ...(options ?? {}),
    queryKey: buildQueryKey(call, input, explicitInput),
  } as QueryConfig<TCall, TSelected>;

  if (explicitInput) {
    Object.defineProperty(config, explicitInputKey, {
      value: true,
      enumerable: false,
    });
  }

  return config;
}
