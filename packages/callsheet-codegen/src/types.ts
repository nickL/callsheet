export type CallBuilderKind = 'query' | 'mutation';

export interface GraphQLDocumentDiscoveryInput {
  /**
   * Root directory used for entry and namespace resolution.
   */
  rootDir: string;
  /**
   * TypeScript project config used for module resolution and export discovery.
   */
  tsconfigFile: string;
  /**
   * Entry module file paths or glob patterns relative to `rootDir`.
   */
  entries: readonly string[];
  /**
   * Optional glob patterns, also relative to `rootDir`, used to exclude entry
   * matches.
   */
  exclude?: readonly string[];
  /**
   * Export suffix used to identify GraphQL document exports.
   * Defaults to `Document`.
   */
  exportSuffix?: string;
}

export interface ImportedCallOptionsReference {
  /**
   * Module specifier to use in the generated file.
   */
  from: string;
  /**
   * Export name to import from the referenced module.
   */
  name: string;
}

export interface GeneratedCallOverrideMatch {
  /**
   * Source file path resolved from `process.cwd()` used for normalization and
   * matching.
   */
  sourceFile: string;
  exportName: string;
}

export interface GeneratedCallOverride {
  match: GeneratedCallOverrideMatch;
  /**
   * Override the generated Callsheet path for this document.
   */
  path?: readonly string[];
  /**
   * Override the generated call type when discovery can't tell whether the
   * document is a query or a mutation.
   */
  kind?: CallBuilderKind;
  /**
   * Import call options such as `dataKey` or `invalidates` from another module.
   */
  options?: ImportedCallOptionsReference;
}

export interface CallsheetCodegenOutputConfig {
  /**
   * Generated Callsheet module file path.
   */
  file: string;
  /**
   * Defaults to `calls`.
   */
  exportName?: string;
  /**
   * Defaults to `callsheet`.
   */
  importFrom?: string;
}

export interface CallsheetCodegenConfig {
  discovery:
    | GraphQLDocumentDiscoveryInput
    | readonly GraphQLDocumentDiscoveryInput[];
  output: CallsheetCodegenOutputConfig;
  overrides?: readonly GeneratedCallOverride[];
}

export interface GenerateCallsheetModuleConfig {
  discovery:
    | GraphQLDocumentDiscoveryInput
    | readonly GraphQLDocumentDiscoveryInput[];
  /**
   * Output file path used for relative import generation.
   */
  outputFile: string;
  /**
   * Defaults to `calls`.
   */
  exportName?: string;
  /**
   * Defaults to `callsheet`.
   */
  importFrom?: string;
  overrides?: readonly GeneratedCallOverride[];
}

export interface DiscoveredGraphQLDocument {
  exportName: string;
  kind?: CallBuilderKind;
  /**
   * Entry module path relative to `process.cwd()`, normalized to use `/`
   * separators.
   */
  sourceFile: string;
  /**
   * Generated Callsheet path before any overrides are applied.
   */
  path: readonly string[];
}

export interface GeneratedCallsheetEntry {
  exportName: string;
  path: readonly string[];
  sourceFile: string;
  builder: CallBuilderKind;
  options?: ImportedCallOptionsReference;
}

export interface GenerateCallsheetModuleResult {
  code: string;
  entries: readonly GeneratedCallsheetEntry[];
  outputFile: string;
}
