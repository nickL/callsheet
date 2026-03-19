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
  /**
   * Define a path prefix that should be added to all discovered entries from
   * this source.
   */
  pathPrefix?: readonly string[];
}

export interface TsRestContractDiscoveryInput {
  /**
   * File path to the module that exports the ts-rest contract.
   */
  importFrom: string;
  /**
   * Export name of the ts-rest contract.
   */
  exportName: string;
  /**
   * Define a path prefix that should be added to all discovered entries from
   * this source.
   */
  pathPrefix?: readonly string[];
}

export interface CallsheetCodegenSourcesConfig {
  graphql?: readonly GraphQLDocumentDiscoveryInput[];
  tsRest?: readonly TsRestContractDiscoveryInput[];
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

export interface GeneratedCallsheetEntryOriginGraphQLDocument {
  kind: 'graphqlDocument';
  exportName: string;
  sourceFile: string;
}

export interface GeneratedCallsheetEntryOriginTsRestRoute {
  kind: 'tsRestRoute';
  exportName: string;
  routePath: readonly string[];
  sourceFile: string;
}

export type GeneratedCallsheetEntryOrigin =
  | GeneratedCallsheetEntryOriginGraphQLDocument
  | GeneratedCallsheetEntryOriginTsRestRoute;

export interface GeneratedCallOverrideEntryGraphQLDocument {
  kind: 'graphqlDocument';
  exportName: string;
  sourceFile: string;
}

export interface GeneratedCallOverrideEntryTsRestRoute {
  kind: 'tsRestRoute';
  exportName: string;
  routePath: readonly string[];
  sourceFile: string;
}

export type GeneratedCallOverrideEntry =
  | GeneratedCallOverrideEntryGraphQLDocument
  | GeneratedCallOverrideEntryTsRestRoute;

export interface GeneratedCallOverride {
  /**
   * Target the generated entry at this path before aliasing.
   */
  path: readonly string[];
  /**
   * Use this when multiple generated entries share the same path and this
   * override should only apply to one of them.
   */
  entry?: GeneratedCallOverrideEntry;
  /**
   * Expose the generated entry at a different path in the final Callsheet tree.
   */
  as?: readonly string[];
  /**
   * Override the generated call type when discovery can't tell whether the
   * source should use a query or mutation builder.
   */
  kind?: CallBuilderKind;
  /**
   * Import call options such as `scope`, `key`, or `invalidates` from another module.
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
  sources: CallsheetCodegenSourcesConfig;
  output: CallsheetCodegenOutputConfig;
  overrides?: readonly GeneratedCallOverride[];
}

export interface GenerateCallsheetModuleConfig {
  sources: CallsheetCodegenSourcesConfig;
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

export interface DiscoveredTsRestRoute {
  exportName: string;
  kind: CallBuilderKind;
  path: readonly string[];
  routePath: readonly string[];
  sourceFile: string;
}

export interface SourceImportReference {
  filePath: string;
  name: string;
  memberPath?: readonly string[];
}

export interface DiscoveredSourceEntry {
  path: readonly string[];
  kind?: CallBuilderKind;
  builderImportFrom: string;
  sourceImport: SourceImportReference;
  origin: GeneratedCallsheetEntryOrigin;
}

export interface GeneratedCallsheetEntry {
  builder: CallBuilderKind;
  origin: GeneratedCallsheetEntryOrigin;
  path: readonly string[];
  options?: ImportedCallOptionsReference;
}

export interface GenerateCallsheetModuleResult {
  code: string;
  entries: readonly GeneratedCallsheetEntry[];
  outputFile: string;
}
