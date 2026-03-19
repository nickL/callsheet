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
  },
  output: {
    file: './src/generated/calls.ts',
  },
  overrides,
};
