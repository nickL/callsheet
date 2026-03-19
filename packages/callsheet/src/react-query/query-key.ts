import { getCallMetadata } from '../define-calls';

import type { CallTypeTag } from '../call-type-tag';
import type { CallInputOf } from '../call-types';
import type { Key, KeyConfig, Scope } from '../scope';
import type { QueryKey } from '@tanstack/react-query';

const callSegmentKey = 'call';
const inputSegmentKey = 'input';
const keySegmentKey = 'key';
type CallLike = CallTypeTag<unknown, unknown>;

export const defaultQueryKeyPrefix = ['callsheet'] as const satisfies QueryKey;

function compareScope(a: Scope, b: Scope): boolean {
  return (
    a.length === b.length && a.every((segment, index) => segment === b[index])
  );
}

export function resolveCallScope<TCall extends CallLike>(
  call: TCall & {
    scope?: Scope;
  },
): Scope {
  if (call.scope) {
    return call.scope;
  }

  throw new Error(
    'Unable to resolve scope for this call. Define `scope` on the call or register the call with defineCalls(...).',
  );
}

function resolveKeyOverride<TCall extends CallLike>(
  call: TCall & {
    key?: KeyConfig<CallInputOf<TCall>>;
    scope?: Scope;
  },
  input: CallInputOf<TCall>,
): Key | undefined {
  if (typeof call.key === 'function') {
    return call.key({
      input,
      scope: resolveCallScope(call),
    });
  }

  return call.key;
}

export function buildQueryKey<TCall extends CallLike>(
  prefix: QueryKey,
  call: TCall & {
    key?: KeyConfig<CallInputOf<TCall>>;
    scope?: Scope;
  },
  input: CallInputOf<TCall> | undefined,
  includeInputSegment = input !== undefined,
): QueryKey {
  const scope = resolveCallScope(call);
  const metadata = getCallMetadata(call);
  const keyOverride = resolveKeyOverride(call, input!);
  const queryKeySegments: unknown[] = [...prefix, ...scope];

  if (keyOverride) {
    return [...queryKeySegments, { [keySegmentKey]: keyOverride }];
  }

  if (metadata && !compareScope(metadata.path, scope)) {
    queryKeySegments.push({ [callSegmentKey]: metadata.path });
  }

  if (!includeInputSegment) {
    return queryKeySegments;
  }

  return [...queryKeySegments, { [inputSegmentKey]: input }];
}

export function buildInvalidationKey(prefix: QueryKey, scope: Scope): QueryKey {
  return [...prefix, ...scope];
}
