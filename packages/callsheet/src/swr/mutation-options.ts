import type { MutationKind } from '../call-kind';
import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type { Family, InvalidationConfig } from '../family';
import type { SWRDefaultError, SWRMutationKey } from './types';
import type { SWRMutationConfiguration } from 'swr/mutation';

type UnsupportedLocalMutationOptionKeys = 'fetcher';

export type MutationCallLike = CallTypeTag<unknown, unknown> & {
  kind: MutationKind;
};

export type MutationCallOptions<TCall extends MutationCallLike> = Omit<
  SWRMutationConfiguration<
    CallOutputOf<TCall>,
    SWRDefaultError,
    SWRMutationKey,
    CallInputOf<TCall>,
    CallOutputOf<TCall>
  > & {
    throwOnError?: boolean;
  },
  UnsupportedLocalMutationOptionKeys
>;

export function resolveCallMutationDefaults<TCall extends MutationCallLike>(
  call: TCall & {
    invalidates?: InvalidationConfig<CallInputOf<TCall>, CallOutputOf<TCall>>;
  },
): Record<string, unknown> {
  const {
    family: _ignoredFamily,
    invalidates: _ignoredInvalidates,
    key: _ignoredKey,
    kind: _ignoredKind,
    onError: _ignoredOnError,
    onSuccess: _ignoredOnSuccess,
    optimisticData: _ignoredOptimisticData,
    rollbackOnError: _ignoredRollbackOnError,
    source: _ignoredSource,
    throwOnError: _ignoredThrowOnError,
    ...swrMutationDefaults
  } = call as TCall & Record<string, unknown>;

  return swrMutationDefaults;
}

export function resolveMutationInvalidations<TCall extends MutationCallLike>(
  call: TCall & {
    invalidates?: InvalidationConfig<CallInputOf<TCall>, CallOutputOf<TCall>>;
  },
  input: CallInputOf<TCall>,
  output: CallOutputOf<TCall>,
): readonly Family[] {
  if (typeof call.invalidates === 'function') {
    return call.invalidates({ input, output });
  }

  return call.invalidates ?? [];
}
