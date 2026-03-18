import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tempRoots: string[] = [];
const TESTS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export function fixtureRoot(name: string): string {
  return path.join(TESTS_ROOT, 'fixtures', name);
}

export function fixturePath(name: string, relativePath = ''): string {
  return path.join(fixtureRoot(name), relativePath);
}

export function normalizeSourceFile(filePath: string): string {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

export async function copyFixtureToTemp(name: string): Promise<string> {
  const tempDirectory = path.join(TESTS_ROOT, '.tmp');
  await fs.mkdir(tempDirectory, { recursive: true });

  const tempRoot = await fs.mkdtemp(path.join(tempDirectory, `${name}-`));
  await fs.cp(fixtureRoot(name), tempRoot, { recursive: true });

  tempRoots.push(tempRoot);

  return tempRoot;
}

export async function cleanupTempFixtures(): Promise<void> {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => fs.rm(tempRoot, { force: true, recursive: true })),
  );
}
