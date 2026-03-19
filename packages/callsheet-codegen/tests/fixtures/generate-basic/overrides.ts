export const overrides = [
  {
    match: {
      sourceFile: 'src/graphql/generated.ts',
      exportName: 'FeaturedFilmsDocument',
    },
    path: ['films', 'featured'],
  },
] as const;
