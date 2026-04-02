export interface CallContext<TCall> {
  call: TCall;
}

export interface CallInputContext<TCallInput> {
  input: TCallInput;
}

export interface CallKeyContext<TKey> {
  key: TKey;
}

export interface CallConfigContext<TConfig> {
  config: TConfig;
}

export interface CallMutateContext<TMutate> {
  mutate: TMutate;
}

export interface CallExecutionContext<TExecution> {
  execution?: TExecution;
}
