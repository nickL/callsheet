import { defineConfig } from 'callsheet-codegen';

export default defineConfig({
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
  overrides: [
    {
      path: ['featuredFilms'],
      as: ['films', 'featured'],
      options: {
        from: '../callsheet-options/films',
        name: 'featuredFilmsOptions',
      },
    },
    {
      path: ['filmById'],
      as: ['films', 'byId'],
      options: {
        from: '../callsheet-options/films',
        name: 'filmByIdOptions',
      },
    },
    {
      path: ['refreshFilms'],
      as: ['films', 'refresh'],
      options: {
        from: '../callsheet-options/films',
        name: 'refreshFilmsOptions',
      },
    },
  ],
});
