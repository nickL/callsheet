import type { QueryKind } from '../call-kind';
import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type { SWRCallKey, SWRDefaultError } from './types';
import type { Fetcher, SWRConfiguration } from 'swr';

type NoInputLike = void | undefined;

export type HasNoInput<TInput> = [TInput] extends [NoInputLike]
  ? [NoInputLike] extends [TInput]
    ? true
    : false
  : false;

type QueryInputField<TCall extends QueryCallLike> =
  HasNoInput<CallInputOf<TCall>> extends true
    ? {
        input?: CallInputOf<TCall>;
      }
    : {
        input: CallInputOf<TCall>;
      };

type RequiredOptionsArg<TOptions> = [options: TOptions];
type OptionalOptionsArg<TOptions> = [options?: TOptions];

type UnsupportedLocalQueryOptionKeys = 'fetcher';

export type QueryCallLike = CallTypeTag<unknown, unknown> & {
  kind: QueryKind;
};

type LocalQueryOptions<TCall extends QueryCallLike> = Omit<
  SWRConfiguration<
    CallOutputOf<TCall>,
    SWRDefaultError,
    Fetcher<CallOutputOf<TCall>, SWRCallKey>
  >,
  UnsupportedLocalQueryOptionKeys
>;

type EnabledQueryField<TCall extends QueryCallLike> =
  HasNoInput<CallInputOf<TCall>> extends true
    ? QueryInputField<TCall> & {
        enabled?: boolean;
      }
    :
        | (QueryInputField<TCall> & {
            enabled?: true | undefined;
          })
        | {
            enabled: false;
            input?: CallInputOf<TCall>;
          };

export type QueryCallOptions<TCall extends QueryCallLike> =
  EnabledQueryField<TCall> & LocalQueryOptions<TCall>;

export type QueryCallArgs<TCall extends QueryCallLike> =
  HasNoInput<CallInputOf<TCall>> extends true
    ? OptionalOptionsArg<QueryCallOptions<TCall>>
    : RequiredOptionsArg<QueryCallOptions<TCall>>;

export function hasExplicitInput<TCall extends QueryCallLike>(
  options: QueryCallOptions<TCall> | undefined,
): boolean {
  return options !== undefined && Object.hasOwn(options, 'input');
}

export function resolveLocalQueryOptions<TCall extends QueryCallLike>(
  options: QueryCallOptions<TCall> | undefined,
): LocalQueryOptions<TCall> | undefined {
  if (!options) {
    return undefined;
  }

  const { enabled: _enabled, input: _input, ...localOptions } = options;

  return localOptions as LocalQueryOptions<TCall>;
}

export function resolveQueryEnabled<TCall extends QueryCallLike>(
  options: QueryCallOptions<TCall> | undefined,
): boolean {
  return options?.enabled !== false;
}

export function resolveCallQueryDefaults<TCall extends QueryCallLike>(
  call: TCall,
): LocalQueryOptions<TCall> {
  const {
    enabled: _ignoredEnabled,
    family: _ignoredFamily,
    fetcher: _ignoredFetcher,
    key: _ignoredKey,
    kind: _ignoredKind,
    source: _ignoredSource,
    ...queryDefaults
  } = call as TCall & Record<string, unknown>;

  return queryDefaults as LocalQueryOptions<TCall>;
}
