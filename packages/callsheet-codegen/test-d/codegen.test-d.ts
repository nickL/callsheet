import { expectType } from 'tsd';

import {
  defineConfig,
  discoverGraphQLDocuments,
  generateCallsheetModule,
  writeCallsheetModule,
} from '../dist/index.js';

import type {
  CallBuilderKind,
  CallsheetCodegenConfig,
  DiscoveredGraphQLDocument,
  GenerateCallsheetModuleConfig,
  GenerateCallsheetModuleResult,
  GeneratedCallOverride,
} from '../dist/index.js';

const override: GeneratedCallOverride = {
  match: {
    sourceFile: 'src/graphql/films.ts',
    exportName: 'FilmByIdDocument',
  },
  kind: 'query',
  options: {
    from: '../callsheet-options/films',
    name: 'filmByIdOptions',
  },
  path: ['films', 'byId'],
};

const config: GenerateCallsheetModuleConfig = {
  discovery: {
    entries: ['films.ts'],
    rootDir: 'src/graphql',
    tsconfigFile: 'tsconfig.json',
  },
  outputFile: 'src/generated/calls.ts',
  overrides: [override],
};

const callsheetConfig: CallsheetCodegenConfig = defineConfig({
  discovery: config.discovery,
  output: {
    file: config.outputFile,
  },
  overrides: [override],
});

expectType<Promise<DiscoveredGraphQLDocument[]>>(
  discoverGraphQLDocuments(config.discovery),
);
expectType<CallBuilderKind>(override.kind!);
expectType<CallsheetCodegenConfig>(callsheetConfig);
expectType<Promise<GenerateCallsheetModuleResult>>(
  generateCallsheetModule(config),
);
expectType<Promise<GenerateCallsheetModuleResult>>(
  writeCallsheetModule(config),
);
