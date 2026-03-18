export const filmByIdOptions = {
  dataKey: ({ input }: { input: { id: string } }) =>
    ['film', input.id] as const,
};
