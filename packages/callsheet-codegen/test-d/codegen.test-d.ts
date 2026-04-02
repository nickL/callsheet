import { expectAssignable, expectType } from 'tsd';

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
  CallsheetOutputAdapter,
  GenerateCallsheetModuleConfig,
  GenerateCallsheetModuleResult,
  GeneratedCallOverride,
  TsRestContractDiscoveryInput,
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
  tsRest: [
    {
      exportName: 'contract',
      importFrom: 'src/rest/contract',
      pathPrefix: ['rest'],
    },
  ],
};

const tsRestSource: TsRestContractDiscoveryInput = {
  exportName: 'contract',
  importFrom: 'src/rest/contract',
  pathPrefix: ['rest'],
};

const config: GenerateCallsheetModuleConfig = {
  adapter: 'react-query',
  sources,
  outputFile: 'src/generated/calls.ts',
  overrides: [override],
};

const swrConfig: GenerateCallsheetModuleConfig = {
  importFrom: '@callsheet/swr',
  outputFile: 'src/generated/calls.ts',
  sources,
};

const callsheetConfig: CallsheetCodegenConfig = defineConfig({
  sources,
  output: {
    adapter: 'react-query',
    file: config.outputFile,
  },
  overrides: [override],
});

const outputAdapter: CallsheetOutputAdapter = 'swr';

expectType<Promise<Awaited<ReturnType<typeof discoverGraphQLDocuments>>>>(
  discoverGraphQLDocuments(sources.graphql!),
);
expectType<CallBuilderKind>(override.kind!);
expectType<CallsheetCodegenConfig>(callsheetConfig);
expectAssignable<CallsheetOutputAdapter>(outputAdapter);
expectType<TsRestContractDiscoveryInput>(tsRestSource);
expectType<Promise<GenerateCallsheetModuleResult>>(
  generateCallsheetModule(config),
);
expectType<Promise<GenerateCallsheetModuleResult>>(
  generateCallsheetModule(swrConfig),
);
expectType<Promise<GenerateCallsheetModuleResult>>(
  writeCallsheetModule(config),
);
