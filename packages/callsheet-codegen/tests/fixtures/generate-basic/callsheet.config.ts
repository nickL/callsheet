import { overrides } from './overrides';

export default {
  sources: {
    graphql: [
      {
        rootDir: './src/graphql',
        tsconfigFile: './tsconfig.json',
        entries: ['generated.ts'],
      },
    ],
    tsRest: [
      {
        exportName: 'contract',
        importFrom: './src/rest/contract',
        pathPrefix: ['rest'],
      },
    ],
  },
  output: {
    file: './src/generated/calls.ts',
  },
  overrides,
};
