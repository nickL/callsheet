import {
  type CallLike,
  callsheetKeyRoot,
  callPathSegment,
  familyEquals,
  inputSegment,
  keyOverrideSegment,
  resolveCallFamily,
  resolveKeyOverride,
} from '../call-identity';
import { getCallMetadata } from '../define-calls';

import type { QueryKind } from '../call-kind';
import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type { Family, KeyConfig } from '../family';
import type { DataTag, DefaultError, QueryKey } from '@tanstack/react-query';

export const defaultQueryKeyPrefix = [
  callsheetKeyRoot,
] as const satisfies QueryKey;

export type QueryCallKey<
  TCall extends CallTypeTag<unknown, unknown> & {
    kind: QueryKind;
  },
> = DataTag<QueryKey, CallOutputOf<TCall>, DefaultError>;

export function buildQueryKey<TCall extends CallLike & { kind: QueryKind }>(
  call: TCall & {
    key?: KeyConfig<CallInputOf<TCall>>;
    family?: Family;
  },
  input: CallInputOf<TCall> | undefined,
  includeInputSegment = input !== undefined,
): QueryCallKey<TCall> {
  const family = resolveCallFamily(call);
  const metadata = getCallMetadata(call);
  const keyOverride = resolveKeyOverride(call, input!);
  const queryKeySegments: unknown[] = [...defaultQueryKeyPrefix, ...family];

  if (keyOverride) {
    return [
      ...queryKeySegments,
      { [keyOverrideSegment]: keyOverride },
    ] as unknown as QueryCallKey<TCall>;
  }

  if (metadata && !familyEquals(metadata.path, family)) {
    queryKeySegments.push({ [callPathSegment]: metadata.path });
  }

  if (!includeInputSegment) {
    return queryKeySegments as unknown as QueryCallKey<TCall>;
  }

  return [
    ...queryKeySegments,
    { [inputSegment]: input },
  ] as unknown as QueryCallKey<TCall>;
}

export function buildInvalidationKey(family: Family): QueryKey {
  return [...defaultQueryKeyPrefix, ...family];
}
