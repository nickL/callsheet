#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createJiti } from 'jiti';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const distCliPath = path.join(packageRoot, 'dist/cli.js');
const srcCliPath = path.join(packageRoot, 'src/cli.ts');

const { runCli } = await loadCli();

try {
  await runCli(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

async function loadCli() {
  if (await fileExists(srcCliPath)) {
    const jiti = createJiti(packageRoot);
    return jiti.import(srcCliPath, { default: false });
  }

  return import(pathToFileURL(distCliPath).href);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
