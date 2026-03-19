#!/usr/bin/env node

import { parseArgs } from 'node:util';

import {
  loadCallsheetCodegenConfig,
  toGenerateCallsheetModuleConfig,
} from './config';
import { writeCallsheetModule } from './generate';

import type { GenerateCallsheetModuleResult } from './types';

export async function runCli(argv: readonly string[]): Promise<void> {
  const parsedArgs = parseCliArgs(argv);

  if (parsedArgs.help) {
    process.stdout.write(`${getHelpText()}\n`);
    return;
  }

  const loadedConfig = await loadCallsheetCodegenConfig(parsedArgs.configPath);
  const result = await writeCallsheetModule(
    toGenerateCallsheetModuleConfig(
      loadedConfig.config,
      loadedConfig.configFilePath,
    ),
  );

  writeSuccess(result);
}

function parseCliArgs(argv: readonly string[]): {
  configPath?: string;
  help: boolean;
} {
  const { values } = parseArgs({
    args: [...argv],
    allowPositionals: false,
    options: {
      config: {
        short: 'c',
        type: 'string',
      },
      help: {
        short: 'h',
        type: 'boolean',
      },
    },
    strict: true,
  });

  return {
    ...(values.config === undefined ? {} : { configPath: values.config }),
    help: values.help ?? false,
  };
}

function getHelpText(): string {
  return [
    'Usage: callsheet-codegen [--config callsheet.config.ts]',
    '',
    'Options:',
    '  -c, --config <path>  Load a specific Callsheet config file',
    '  -h, --help           Show this help output',
  ].join('\n');
}

function writeSuccess(result: GenerateCallsheetModuleResult): void {
  process.stdout.write(`Generated ${result.outputFile}\n`);
}
