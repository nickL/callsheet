import {
  callsheetKeyRoot,
  callPathSegment,
  familyEquals,
  familyStartsWith,
  inputSegment,
  keyOverrideSegment,
  resolveCallFamily,
  resolveKeyOverride,
} from '../call-identity';
import { getCallMetadata } from '../define-calls';
import {
  type SWRCallKey,
  type SWRKeyIdentity,
  type SWRKeyIdentitySegment,
} from './types';

import type { CallLike } from '../call-identity';
import type { CallInputOf } from '../call-types';
import type { Family, KeyConfig } from '../family';

export function buildSWRKey<TCall extends CallLike>(
  call: TCall & {
    key?: KeyConfig<CallInputOf<TCall>>;
    family?: Family;
  },
  input: CallInputOf<TCall> | undefined,
  includeInputSegment = input !== undefined,
): SWRCallKey {
  const family = resolveCallFamily(call);
  const metadata = getCallMetadata(call);
  const keyOverride = resolveKeyOverride(call, input!);
  const identity: SWRKeyIdentitySegment[] = [];

  if (keyOverride) {
    identity.push([keyOverrideSegment, keyOverride]);
    return [callsheetKeyRoot, family, identity] as const;
  }

  if (metadata && !familyEquals(metadata.path, family)) {
    identity.push([callPathSegment, metadata.path]);
  }

  if (includeInputSegment) {
    identity.push([inputSegment, input]);
  }

  return [callsheetKeyRoot, family, identity] as const;
}

export function isSWRCallKey(value: unknown): value is SWRCallKey {
  if (!Array.isArray(value) || value.length !== 3) {
    return false;
  }

  const tuple = value as unknown[];
  const root = tuple[0];
  const family = tuple[1];
  const identity = tuple[2];

  return (
    root === callsheetKeyRoot &&
    Array.isArray(family) &&
    Array.isArray(identity)
  );
}

export function extractFamilyFromSWRKey(value: unknown): Family | undefined {
  if (!isSWRCallKey(value)) {
    return undefined;
  }

  const [, family] = value;

  return family;
}

export function extractIdentityFromSWRKey(
  value: unknown,
): SWRKeyIdentity | undefined {
  if (!isSWRCallKey(value)) {
    return undefined;
  }

  const [, , identity] = value;

  return identity;
}

export function matchesFamilyInSWRKey(value: unknown, family: Family): boolean {
  const callFamily = extractFamilyFromSWRKey(value);

  if (!callFamily) {
    return false;
  }

  return familyStartsWith(family, callFamily);
}
