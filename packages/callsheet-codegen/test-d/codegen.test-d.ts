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
  CallsheetCodegenSourcesConfig,
  GenerateCallsheetModuleConfig,
  GenerateCallsheetModuleResult,
  GeneratedCallOverride,
} from '../dist/index.js';

const override: GeneratedCallOverride = {
  path: ['filmById'],
  as: ['films', 'byId'],
  kind: 'query',
  options: {
    from: '../callsheet-options/films',
    name: 'filmByIdOptions',
  },
};

const sources: CallsheetCodegenSourcesConfig = {
  graphql: [
    {
      entries: ['films.ts'],
      rootDir: 'src/graphql',
      tsconfigFile: 'tsconfig.json',
    },
  ],
};

const config: GenerateCallsheetModuleConfig = {
  sources,
  outputFile: 'src/generated/calls.ts',
  overrides: [override],
};

const callsheetConfig: CallsheetCodegenConfig = defineConfig({
  sources,
  output: {
    file: config.outputFile,
  },
  overrides: [override],
});

expectType<Promise<Awaited<ReturnType<typeof discoverGraphQLDocuments>>>>(
  discoverGraphQLDocuments(sources.graphql!),
);
expectType<CallBuilderKind>(override.kind!);
expectType<CallsheetCodegenConfig>(callsheetConfig);
expectType<Promise<GenerateCallsheetModuleResult>>(
  generateCallsheetModule(config),
);
expectType<Promise<GenerateCallsheetModuleResult>>(
  writeCallsheetModule(config),
);
