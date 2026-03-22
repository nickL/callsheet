import {
  getStoredCallMetadata,
  isCall,
  setStoredCallMetadata,
} from './call-registry';

import type { CallTypeTag } from './call-type-tag';
import type { CallMetadata } from './call-types';
import type { Family } from './family';

type CallLike = CallTypeTag<unknown, unknown> & {
  kind: unknown;
};

type CallTreeWithFamily<TNode> = TNode extends CallLike
  ? TNode & {
      family: Family;
    }
  : TNode extends readonly unknown[]
    ? TNode
    : TNode extends Record<string, unknown>
      ? {
          [TKey in keyof TNode]: CallTreeWithFamily<TNode[TKey]>;
        }
      : TNode;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function annotateCallTree(node: unknown, path: readonly string[]): void {
  if (isCall(node)) {
    setStoredCallMetadata(node, { path });

    if (!Object.hasOwn(node, 'family') || node.family === undefined) {
      node.family = path;
    }

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
): CallTreeWithFamily<TCalls> {
  annotateCallTree(calls, []);
  return calls as CallTreeWithFamily<TCalls>;
}

export function getCallMetadata(
  callDescriptor: unknown,
): CallMetadata | undefined {
  return getStoredCallMetadata(callDescriptor);
}
