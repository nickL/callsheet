import type { CallTypeTag } from './call-type-tag';
import type { CallInputOf } from './call-types';
import type { Family, Key, KeyConfig } from './family';

export type CallLike = CallTypeTag<unknown, unknown>;
export const callsheetKeyRoot = 'callsheet' as const;
export const callPathSegment = 'call' as const;
export const inputSegment = 'input' as const;
export const keyOverrideSegment = 'key' as const;

export function familyEquals(a: Family, b: Family): boolean {
  return (
    a.length === b.length && a.every((segment, index) => segment === b[index])
  );
}

export function familyStartsWith(target: Family, candidate: Family): boolean {
  return (
    target.length <= candidate.length &&
    target.every((segment, index) => segment === candidate[index])
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

export function resolveKeyOverride<TCall extends CallLike>(
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
