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

import type { CallInputOf } from '../call-types';
import type { Family, KeyConfig } from '../family';
import type { QueryKey } from '@tanstack/react-query';

export const defaultQueryKeyPrefix = [
  callsheetKeyRoot,
] as const satisfies QueryKey;

export function buildQueryKey<TCall extends CallLike>(
  prefix: QueryKey,
  call: TCall & {
    key?: KeyConfig<CallInputOf<TCall>>;
    family?: Family;
  },
  input: CallInputOf<TCall> | undefined,
  includeInputSegment = input !== undefined,
): QueryKey {
  const family = resolveCallFamily(call);
  const metadata = getCallMetadata(call);
  const keyOverride = resolveKeyOverride(call, input!);
  const queryKeySegments: unknown[] = [...prefix, ...family];

  if (keyOverride) {
    return [...queryKeySegments, { [keyOverrideSegment]: keyOverride }];
  }

  if (metadata && !familyEquals(metadata.path, family)) {
    queryKeySegments.push({ [callPathSegment]: metadata.path });
  }

  if (!includeInputSegment) {
    return queryKeySegments;
  }

  return [...queryKeySegments, { [inputSegment]: input }];
}

export function buildInvalidationKey(
  prefix: QueryKey,
  family: Family,
): QueryKey {
  return [...prefix, ...family];
}
