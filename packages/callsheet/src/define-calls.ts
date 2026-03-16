import {
  getStoredCallMetadata,
  isCall,
  setStoredCallMetadata,
} from './call-registry';

import type { CallMetadata } from './call-types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function annotateCallTree(node: unknown, path: readonly string[]): void {
  if (isCall(node)) {
    setStoredCallMetadata(node, { path });
    return;
  }

  if (!isRecord(node)) {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    annotateCallTree(value, [...path, key]);
  }
}

/**
 * Registers each call with its path in the calls tree.
 */
export function defineCalls<const TCalls extends Record<string, unknown>>(
  calls: TCalls,
): TCalls {
  annotateCallTree(calls, []);
  return calls;
}

export function getCallMetadata(
  callDescriptor: unknown,
): CallMetadata | undefined {
  return getStoredCallMetadata(callDescriptor);
}
