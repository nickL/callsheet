const base = {
  operation: 'query',
} as const;

const referencedDocument = {
  definitions: [{ kind: 'OperationDefinition', operation: 'query' }],
} as const;

export const FragmentLikeDocument = {
  definitions: [{ ...base, kind: 'FragmentDefinition' }],
} as const;

export const ReferencedDocument = referencedDocument;

export const MissingOperationDocument = {
  definitions: [{ kind: 'OperationDefinition' }],
} as const;

export const InvalidDefinitionsDocument = {
  definitions: {},
} as const;

export const NumericDefinitionDocument = {
  definitions: [42],
} as const;
