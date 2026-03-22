import { getCallMetadata } from '../define-calls';

import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf } from '../call-types';
import type { Family, Key, KeyConfig } from '../family';
import type { QueryKey } from '@tanstack/react-query';

const callSegmentKey = 'call';
const inputSegmentKey = 'input';
const keySegmentKey = 'key';
type CallLike = CallTypeTag<unknown, unknown>;

export const defaultQueryKeyPrefix = ['callsheet'] as const satisfies QueryKey;

function compareFamily(a: Family, b: Family): boolean {
  return (
    a.length === b.length && a.every((segment, index) => segment === b[index])
  );
}

export function resolveCallFamily<TCall extends CallLike>(
  call: TCall & {
    family?: Family;
  },
): Family {
  if (call.family) {
    return call.family;
  }

  throw new Error(
    'Unable to resolve family for this call. Define `family` on the call or register the call with defineCalls(...).',
  );
}

function resolveKeyOverride<TCall extends CallLike>(
  call: TCall & {
    key?: KeyConfig<CallInputOf<TCall>>;
    family?: Family;
  },
  input: CallInputOf<TCall>,
): Key | undefined {
  if (typeof call.key === 'function') {
    return call.key({
      family: resolveCallFamily(call),
      input,
    });
  }

  return call.key;
}

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
    return [...queryKeySegments, { [keySegmentKey]: keyOverride }];
  }

  if (metadata && !compareFamily(metadata.path, family)) {
    queryKeySegments.push({ [callSegmentKey]: metadata.path });
  }

  if (!includeInputSegment) {
    return queryKeySegments;
  }

  return [...queryKeySegments, { [inputSegmentKey]: input }];
}

export function buildInvalidationKey(
  prefix: QueryKey,
  family: Family,
): QueryKey {
  return [...prefix, ...family];
}
