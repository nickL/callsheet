export function isDevEnv(): boolean {
  const runtimeGlobal = globalThis as typeof globalThis & {
    process?: {
      env?: {
        NODE_ENV?: string;
      };
    };
  };
  const runtimeProcess =
    (typeof process !== 'undefined' ? process : undefined) ??
    runtimeGlobal.process;

  return runtimeProcess?.env?.NODE_ENV !== 'production';
}
