/**
 * Family identifies the related data a call belongs to.
 * It is used for query-key grouping and invalidation.
 *
 */
export type FamilyPart = string | number | boolean | null | undefined;
export type Family = readonly FamilyPart[];

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
  family: Family;
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
) => readonly Family[];

export type KeyConfig<TCallInput> = Key | KeyResolver<TCallInput>;

export type InvalidationConfig<TCallInput, TCallOutput> =
  | readonly Family[]
  | InvalidationResolver<TCallInput, TCallOutput>;

export interface CallOptions<TCallInput = unknown, TCallOutput = unknown> {
  family?: Family;
  key?: KeyConfig<TCallInput>;
  invalidates?: InvalidationConfig<TCallInput, TCallOutput>;
}

export interface QueryOptions<TCallInput = unknown> {
  family?: Family;
  key?: KeyConfig<TCallInput>;
}

export interface MutationOptions<
  TCallInput = unknown,
  TCallOutput = unknown,
> extends QueryOptions<TCallInput> {
  invalidates?: InvalidationConfig<TCallInput, TCallOutput>;
}
