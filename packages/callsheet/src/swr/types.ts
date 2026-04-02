import type {
  CallConfigContext,
  CallContext,
  CallExecutionContext,
  CallInputContext,
  CallKeyContext,
  CallMutateContext,
} from '../call-context';
import type {
  callsheetKeyRoot,
  callPathSegment,
  inputSegment,
  keyOverrideSegment,
  CallLike,
} from '../call-identity';
import type { CallInputOf, CallOutputOf } from '../call-types';
import type { Family, Key } from '../family';
import type { ScopedMutator, SWRConfiguration, SWRResponse } from 'swr';

type SWRKeyRoot = typeof callsheetKeyRoot;

export type SWRKeyIdentitySegment =
  | readonly [typeof keyOverrideSegment, Key]
  | readonly [typeof callPathSegment, readonly string[]]
  | readonly [typeof inputSegment, unknown];

export type SWRKeyIdentity = readonly SWRKeyIdentitySegment[];

export type SWRCallKey = readonly [SWRKeyRoot, Family, SWRKeyIdentity];
export type SWRMutationKey = SWRCallKey | (() => SWRCallKey);
export type SWRDefaultError = SWRResponse<unknown>['error'];

export type ExecuteCallMetadata = Readonly<Record<string, unknown>>;

type SWRAdapterContext<TCall extends CallLike> = CallContext<TCall> &
  CallInputContext<CallInputOf<TCall>> &
  CallKeyContext<SWRCallKey> &
  CallConfigContext<SWRConfiguration> &
  CallMutateContext<ScopedMutator> &
  CallExecutionContext<ExecuteCallMetadata>;

export type ExecuteCallContext<TCall extends CallLike> =
  SWRAdapterContext<TCall>;

export type ExecuteCall = <TCall extends CallLike>(
  context: ExecuteCallContext<TCall>,
) => Promise<CallOutputOf<TCall>>;

export interface ExecuteCallOverrides {
  execution?: ExecuteCallMetadata;
}

export type ExecuteCallNext<TCall extends CallLike> = (
  overrides?: ExecuteCallOverrides,
) => Promise<CallOutputOf<TCall>>;

export type ExecuteCallMiddleware = <TCall extends CallLike>(
  context: ExecuteCallContext<TCall>,
  next: ExecuteCallNext<TCall>,
) => Promise<CallOutputOf<TCall>>;

export interface SWRAdapterConfig {
  execute: ExecuteCall;
  middleware?: readonly ExecuteCallMiddleware[];
}
