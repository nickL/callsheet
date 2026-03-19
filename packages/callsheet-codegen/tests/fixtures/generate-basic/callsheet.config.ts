import { overrides } from './overrides';

export default {
  discovery: {
    rootDir: '.',
    tsconfigFile: './tsconfig.json',
    entries: ['src/graphql/generated.ts'],
  },
  output: {
    file: './src/generated/calls.ts',
  },
  overrides,
};
