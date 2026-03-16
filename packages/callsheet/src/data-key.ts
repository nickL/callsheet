/**
 * Data key is the identifier for the data a call represents.
 */
export type DataKeyPart = string | number | boolean | null | undefined;
export type DataKey = readonly DataKeyPart[];

export interface CallInputContext<TCallInput> {
  input: TCallInput;
}

export interface MutationResultContext<
  TCallInput,
  TCallOutput,
> extends CallInputContext<TCallInput> {
  output: TCallOutput;
}

export type DataKeyResolver<TCallInput> = (
  context: CallInputContext<TCallInput>,
) => DataKey;

export type InvalidationResolver<TCallInput, TCallOutput> = (
  context: MutationResultContext<TCallInput, TCallOutput>,
) => readonly DataKey[];

export type DataKeyConfig<TCallInput> = DataKey | DataKeyResolver<TCallInput>;

export type InvalidationConfig<TCallInput, TCallOutput> =
  | readonly DataKey[]
  | InvalidationResolver<TCallInput, TCallOutput>;

export interface CallOptions<TCallInput = unknown, TCallOutput = unknown> {
  dataKey?: DataKeyConfig<TCallInput>;
  invalidates?: InvalidationConfig<TCallInput, TCallOutput>;
}

export interface QueryOptions<TCallInput = unknown> {
  dataKey?: DataKeyConfig<TCallInput>;
}

export interface MutationOptions<
  TCallInput = unknown,
  TCallOutput = unknown,
> extends QueryOptions<TCallInput> {
  invalidates?: InvalidationConfig<TCallInput, TCallOutput>;
}
