/**
 * Scope groups calls that represent the same family of data.
 * It is used for cache grouping and invalidation.
 *
 */
export type ScopePart = string | number | boolean | null | undefined;
export type Scope = readonly ScopePart[];

/**
 * Key is the exact cache identity for a specific call.
 * Its meant to stay broad so adapters can preserve specific key shapes.
 *
 */
export type KeyPart = unknown;
export type Key = readonly KeyPart[];

export interface CallInputContext<TCallInput> {
  input: TCallInput;
}

export interface KeyContext<TCallInput> extends CallInputContext<TCallInput> {
  scope: Scope;
}

export interface MutationResultContext<
  TCallInput,
  TCallOutput,
> extends CallInputContext<TCallInput> {
  output: TCallOutput;
}

export type KeyResolver<TCallInput> = (context: KeyContext<TCallInput>) => Key;

export type InvalidationResolver<TCallInput, TCallOutput> = (
  context: MutationResultContext<TCallInput, TCallOutput>,
) => readonly Scope[];

export type KeyConfig<TCallInput> = Key | KeyResolver<TCallInput>;

export type InvalidationConfig<TCallInput, TCallOutput> =
  | readonly Scope[]
  | InvalidationResolver<TCallInput, TCallOutput>;

export interface CallOptions<TCallInput = unknown, TCallOutput = unknown> {
  scope?: Scope;
  key?: KeyConfig<TCallInput>;
  invalidates?: InvalidationConfig<TCallInput, TCallOutput>;
}

export interface QueryOptions<TCallInput = unknown> {
  scope?: Scope;
  key?: KeyConfig<TCallInput>;
}

export interface MutationOptions<
  TCallInput = unknown,
  TCallOutput = unknown,
> extends QueryOptions<TCallInput> {
  invalidates?: InvalidationConfig<TCallInput, TCallOutput>;
}
