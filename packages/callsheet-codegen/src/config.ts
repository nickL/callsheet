import fsPromises from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { createJiti } from 'jiti';

import { isObjectRecord } from './internal-utils';

import type {
  CallsheetCodegenConfig,
  CallsheetCodegenSourcesConfig,
  GenerateCallsheetModuleConfig,
  GraphQLDocumentDiscoveryInput,
  TsRestContractDiscoveryInput,
} from './types';

const DEFAULT_CONFIG_FILE_NAMES = [
  'callsheet.config.ts',
  'callsheet.config.mts',
  'callsheet.config.cts',
  'callsheet.config.js',
  'callsheet.config.mjs',
  'callsheet.config.cjs',
] as const;
const TYPE_SCRIPT_CONFIG_EXTENSIONS = ['.ts', '.mts', '.cts'] as const;
const IMPORTABLE_CONFIG_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

export function defineConfig(
  config: CallsheetCodegenConfig,
): CallsheetCodegenConfig {
  return config;
}

export async function resolveConfigFilePath(
  configPath?: string,
): Promise<string> {
  if (configPath) {
    return path.resolve(process.cwd(), configPath);
  }

  for (const fileName of DEFAULT_CONFIG_FILE_NAMES) {
    const candidate = path.resolve(process.cwd(), fileName);

    try {
      await fsPromises.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    [
      'No Callsheet config file was found.',
      ...DEFAULT_CONFIG_FILE_NAMES.map((fileName) => `  - ${fileName}`),
    ].join('\n'),
  );
}

export async function loadCallsheetCodegenConfig(
  configPath?: string,
): Promise<{ config: CallsheetCodegenConfig; configFilePath: string }> {
  const configFilePath = await resolveConfigFilePath(configPath);
  const config = await loadConfig(configFilePath);

  return {
    config,
    configFilePath,
  };
}

export function toGenerateCallsheetModuleConfig(
  config: CallsheetCodegenConfig,
  configFilePath: string,
): GenerateCallsheetModuleConfig {
  const configDirectory = path.dirname(configFilePath);
  const baseConfig = {
    sources: resolveSourcesConfig(config.sources, configDirectory),
    outputFile: path.resolve(configDirectory, config.output.file),
    ...(config.output.exportName === undefined
      ? {}
      : { exportName: config.output.exportName }),
    ...(config.overrides === undefined ? {} : { overrides: config.overrides }),
  };
  const hasAdapter = 'adapter' in config.output;
  const hasImportFrom = 'importFrom' in config.output;

  if (hasAdapter === hasImportFrom) {
    throw new Error(
      hasAdapter
        ? 'Callsheet codegen output target is ambiguous. Set either adapter or importFrom, not both.'
        : 'Callsheet codegen output target is required. Set either adapter or importFrom.',
    );
  }

  if (hasAdapter) {
    const { adapter } = config.output;

    if (adapter === undefined) {
      throw new Error(
        'Callsheet codegen output target is required. Set either adapter or importFrom.',
      );
    }

    return {
      ...baseConfig,
      adapter,
    };
  }

  const { importFrom } = config.output;

  if (importFrom === undefined) {
    throw new Error(
      'Callsheet codegen output target is required. Set either adapter or importFrom.',
    );
  }

  return {
    ...baseConfig,
    importFrom,
  };
}

async function loadConfig(
  configFilePath: string,
): Promise<CallsheetCodegenConfig> {
  const extension = path.extname(configFilePath);

  if (IMPORTABLE_CONFIG_EXTENSIONS.has(extension)) {
    return readConfigExport(
      await importConfigModule(configFilePath),
      configFilePath,
    );
  }

  if (isTypeScriptConfigExtension(extension)) {
    return readConfigExport(
      await loadTypeScriptConfigModule(configFilePath),
      configFilePath,
    );
  }

  throw new Error(
    `Unsupported Callsheet config file extension: ${path.basename(configFilePath)}`,
  );
}

async function importConfigModule(configFilePath: string): Promise<unknown> {
  const configModule: unknown = await import(
    pathToFileURL(configFilePath).href
  );
  return configModule;
}

function isTypeScriptConfigExtension(
  extension: string,
): extension is (typeof TYPE_SCRIPT_CONFIG_EXTENSIONS)[number] {
  return TYPE_SCRIPT_CONFIG_EXTENSIONS.includes(
    extension as (typeof TYPE_SCRIPT_CONFIG_EXTENSIONS)[number],
  );
}

async function loadTypeScriptConfigModule(
  configFilePath: string,
): Promise<unknown> {
  const jiti = createJiti(configFilePath);
  const configModule: unknown = await jiti.import(configFilePath, {
    default: true,
  });
  return configModule;
}

function readConfigExport(
  configModule: unknown,
  configFilePath: string,
): CallsheetCodegenConfig {
  const configValue = getDefaultExport(configModule);

  if (!isCallsheetCodegenConfig(configValue)) {
    throw new Error(
      `Callsheet config must export a config object: ${configFilePath}`,
    );
  }

  return configValue;
}

function getDefaultExport(configModule: unknown): unknown {
  return isObjectRecord(configModule) &&
    'default' in configModule &&
    configModule.default !== undefined
    ? configModule.default
    : configModule;
}

function isCallsheetCodegenConfig(
  value: unknown,
): value is CallsheetCodegenConfig {
  return isObjectRecord(value) && 'sources' in value && 'output' in value;
}

function resolveSourcesConfig(
  sources: CallsheetCodegenSourcesConfig,
  configDirectory: string,
): CallsheetCodegenSourcesConfig {
  return {
    ...(sources.graphql === undefined
      ? {}
      : {
          graphql: sources.graphql.map((input) =>
            resolveGraphQLDiscoveryInput(input, configDirectory),
          ),
        }),
    ...(sources.tsRest === undefined
      ? {}
      : {
          tsRest: sources.tsRest.map((input) =>
            resolveTsRestDiscoveryInput(input, configDirectory),
          ),
        }),
  };
}

function resolveGraphQLDiscoveryInput(
  input: GraphQLDocumentDiscoveryInput,
  configDirectory: string,
): GraphQLDocumentDiscoveryInput {
  return {
    ...input,
    rootDir: path.resolve(configDirectory, input.rootDir),
    tsconfigFile: path.resolve(configDirectory, input.tsconfigFile),
  };
}

function resolveTsRestDiscoveryInput(
  input: TsRestContractDiscoveryInput,
  configDirectory: string,
): TsRestContractDiscoveryInput {
  return {
    ...input,
    importFrom: path.resolve(configDirectory, input.importFrom),
  };
}
