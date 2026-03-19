import path from 'node:path';

export function toArray<T>(value: T | readonly T[]): readonly T[] {
  return Array.isArray(value) ? value : ([value] as readonly T[]);
}

export function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'en-us', { numeric: true });
}

export function formatPathSegments(pathSegments: readonly string[]): string {
  return pathSegments.join('.');
}

export function normalizeSourceFile(filePath: string): string {
  return path
    .relative(process.cwd(), path.resolve(process.cwd(), filePath))
    .split(path.sep)
    .join('/');
}
