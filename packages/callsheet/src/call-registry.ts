import type { CallMetadata } from './call-types';

const registeredCalls = new WeakSet<Record<string, unknown>>();
const registeredCallMetadata = new WeakMap<
  Record<string, unknown>,
  CallMetadata
>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function registerCall(call: Record<string, unknown>): void {
  registeredCalls.add(call);
}

export function isCall(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && registeredCalls.has(value);
}

export function setStoredCallMetadata(
  call: Record<string, unknown>,
  metadata: CallMetadata,
): void {
  registeredCallMetadata.set(call, metadata);
}

export function getStoredCallMetadata(
  value: unknown,
): CallMetadata | undefined {
  return isRecord(value) ? registeredCallMetadata.get(value) : undefined;
}
