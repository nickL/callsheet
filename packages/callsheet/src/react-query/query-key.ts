import { getCallMetadata } from '../define-calls';

import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf } from '../call-types';
import type { DataKey, DataKeyConfig } from '../data-key';
import type { QueryKey } from '@tanstack/react-query';

const inputSegmentKey = 'input';
type CallLike = CallTypeTag<unknown, unknown>;

export const defaultQueryKeyPrefix = ['callsheet'] as const satisfies QueryKey;

export function resolveCallDataKey<TCall extends CallLike>(
  call: TCall & {
    dataKey?: DataKeyConfig<CallInputOf<TCall>>;
  },
  input: CallInputOf<TCall>,
): DataKey {
  if (typeof call.dataKey === 'function') {
    return call.dataKey({ input });
  }

  if (call.dataKey) {
    return call.dataKey;
  }

  const metadata = getCallMetadata(call);

  if (metadata) {
    return metadata.path;
  }

  throw new Error(
    'Unable to build a React Query key. Define `dataKey` on the call or register the call with defineCalls(...).',
  );
}

export function buildQueryKey<TCall extends CallLike>(
  prefix: QueryKey,
  call: TCall,
  input: CallInputOf<TCall> | undefined,
  includeInputSegment = input !== undefined,
): QueryKey {
  const dataKey = resolveCallDataKey(call, input!);
  const queryKeyBase = [...prefix, ...dataKey];

  if (!includeInputSegment) {
    return queryKeyBase;
  }

  return [...queryKeyBase, { [inputSegmentKey]: input }];
}

export function buildInvalidationKey(
  prefix: QueryKey,
  dataKey: DataKey,
): QueryKey {
  return [...prefix, ...dataKey];
}
