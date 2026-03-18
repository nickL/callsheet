export const FeaturedFilmsDocument = {
  definitions: [{ kind: 'OperationDefinition', operation: 'query' }],
} as const;

const HiddenDocument = {
  definitions: [{ kind: 'OperationDefinition', operation: 'query' }],
} as const;

export { HiddenDocument };
