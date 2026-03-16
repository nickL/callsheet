declare const callTypeTagKey: unique symbol;

export interface CallTypeTag<TCallInput, TCallOutput> {
  readonly [callTypeTagKey]?: {
    input: TCallInput;
    output: TCallOutput;
  };
}
