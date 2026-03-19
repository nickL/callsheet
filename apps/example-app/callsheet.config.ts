import { defineConfig } from 'callsheet-codegen';

export default defineConfig({
  discovery: {
    rootDir: '.',
    tsconfigFile: './tsconfig.json',
    entries: ['src/graphql/generated.ts'],
  },
  output: {
    file: './src/generated/calls.ts',
  },
  overrides: [
    {
      match: {
        sourceFile: 'src/graphql/generated.ts',
        exportName: 'FeaturedFilmsDocument',
      },
      options: {
        from: '../callsheet-options/films',
        name: 'featuredFilmsOptions',
      },
      path: ['films', 'featured'],
    },
    {
      match: {
        sourceFile: 'src/graphql/generated.ts',
        exportName: 'FilmByIdDocument',
      },
      options: {
        from: '../callsheet-options/films',
        name: 'filmByIdOptions',
      },
      path: ['films', 'byId'],
    },
    {
      match: {
        sourceFile: 'src/graphql/generated.ts',
        exportName: 'RefreshFilmsDocument',
      },
      options: {
        from: '../callsheet-options/films',
        name: 'refreshFilmsOptions',
      },
      path: ['films', 'refresh'],
    },
  ],
});
