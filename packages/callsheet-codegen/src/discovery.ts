import path from 'node:path';

import type {
  CallBuilderKind,
  DiscoveredGraphQLDocument,
  GraphQLDocumentDiscoveryInput,
} from './types';
import type * as ts from 'typescript';

const DEFAULT_EXCLUDE = ['**/*.d.ts'];
const GENERIC_FILE_NAMES = new Set([
  'graphql',
  'documents',
  'mutations',
  'operations',
  'queries',
]);
const OPERATION_DEFINITION_KIND = 'OperationDefinition';
const QUERY_OPERATION = 'query';
const MUTATION_OPERATION = 'mutation';
const SUBSCRIPTION_OPERATION = 'subscription';

interface ResolvedDiscoveryInput {
  rootDir: string;
  tsconfigFile: string;
  entries: readonly string[];
  exclude: readonly string[];
  exportSuffix: string;
}

interface ProjectContext {
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  tsconfigFile: string;
}

interface CallsheetDocumentCandidate {
  entryModulePath: string;
  exportName: string;
  documentIdentity: string;
  callsheetPath: readonly string[];
  operationType?: CallBuilderKind;
}

function isDiscoveryInputArray(
  value:
    | GraphQLDocumentDiscoveryInput
    | readonly GraphQLDocumentDiscoveryInput[],
): value is readonly GraphQLDocumentDiscoveryInput[] {
  return Array.isArray(value);
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'en-us', { numeric: true });
}

function normalizeSourceFile(filePath: string): string {
  return path
    .relative(process.cwd(), path.resolve(process.cwd(), filePath))
    .split(path.sep)
    .join('/');
}

function formatConfigDiagnostic(
  diagnostic: ts.Diagnostic,
  typescript: typeof ts,
): string {
  return typescript.formatDiagnostic(diagnostic, {
    getCanonicalFileName(fileName) {
      return fileName;
    },
    getCurrentDirectory() {
      return process.cwd();
    },
    getNewLine() {
      return '\n';
    },
  });
}

function createConfigFileHost(typescript: typeof ts): ts.ParseConfigFileHost {
  return {
    ...typescript.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) {
      throw new Error(formatConfigDiagnostic(diagnostic, typescript));
    },
  };
}

/**
 * Discovery follows a simple pipeline:
 * 1. build discovery inputs
 * 2. resolve entry modules
 * 3. determine document candidates
 * 4. finalize a stable discovery list
 */
export async function discoverGraphQLDocuments(
  input:
    | GraphQLDocumentDiscoveryInput
    | readonly GraphQLDocumentDiscoveryInput[],
): Promise<DiscoveredGraphQLDocument[]> {
  const typescript = await loadTypeScript();
  const discoveryInputs = buildDiscoveryInputs(input);
  const documentCandidates: CallsheetDocumentCandidate[] = [];

  for (const discoveryInput of discoveryInputs) {
    const projectContext = createProjectContext(discoveryInput, typescript);
    const entryModules = resolveEntryModules(discoveryInput, typescript);

    documentCandidates.push(
      ...collectDocumentExports(
        discoveryInput,
        projectContext,
        entryModules,
        typescript,
      ),
    );
  }

  return finalizeDocumentDiscovery(documentCandidates);
}

function buildDiscoveryInputs(
  input:
    | GraphQLDocumentDiscoveryInput
    | readonly GraphQLDocumentDiscoveryInput[],
): ResolvedDiscoveryInput[] {
  const rawInputs = isDiscoveryInputArray(input) ? input : [input];

  return rawInputs.map((config) => {
    const exportSuffix = config.exportSuffix ?? 'Document';

    if (exportSuffix === '') {
      throw new Error('Callsheet codegen exportSuffix cannot be empty.');
    }

    return {
      entries: config.entries,
      exclude: config.exclude ?? DEFAULT_EXCLUDE,
      exportSuffix,
      rootDir: path.resolve(process.cwd(), config.rootDir),
      tsconfigFile: path.resolve(process.cwd(), config.tsconfigFile),
    };
  });
}

async function loadTypeScript(): Promise<typeof ts> {
  try {
    const module = await import('typescript');
    return module.default ?? module;
  } catch {
    throw new Error('Callsheet codegen requires `typescript`.');
  }
}

function createProjectContext(
  discoveryInput: ResolvedDiscoveryInput,
  typescript: typeof ts,
): ProjectContext {
  const parsedConfig = readProjectConfig(
    discoveryInput.tsconfigFile,
    typescript,
  );
  const program = typescript.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    ...(parsedConfig.projectReferences
      ? {
          projectReferences: parsedConfig.projectReferences,
        }
      : {}),
  });

  return {
    program,
    typeChecker: program.getTypeChecker(),
    tsconfigFile: discoveryInput.tsconfigFile,
  };
}

function readProjectConfig(
  tsconfigFile: string,
  typescript: typeof ts,
): ts.ParsedCommandLine {
  const parsedConfig = typescript.getParsedCommandLineOfConfigFile(
    tsconfigFile,
    {},
    createConfigFileHost(typescript),
  );

  if (parsedConfig === undefined) {
    throw new Error(
      `Unable to read the Callsheet codegen tsconfig file: ${tsconfigFile}`,
    );
  }

  return parsedConfig;
}

function resolveEntryModules(
  discoveryInput: ResolvedDiscoveryInput,
  typescript: typeof ts,
): string[] {
  const include = discoveryInput.entries.map((pattern) =>
    path.join(discoveryInput.rootDir, pattern),
  );
  const exclude = discoveryInput.exclude.map((pattern) =>
    path.join(discoveryInput.rootDir, pattern),
  );

  return typescript.sys.readDirectory(
    process.cwd(),
    ['.ts', '.tsx', '.mts', '.cts'],
    exclude,
    include,
  );
}

function collectDocumentExports(
  discoveryInput: ResolvedDiscoveryInput,
  projectContext: ProjectContext,
  entryModules: readonly string[],
  typescript: typeof ts,
): CallsheetDocumentCandidate[] {
  const documentCandidates: CallsheetDocumentCandidate[] = [];

  for (const entryModulePath of entryModules) {
    const entryModuleFile = normalizeSourceFile(entryModulePath);

    for (const exportedSymbol of getEntryModuleExports(
      entryModulePath,
      projectContext,
    )) {
      const exportName = exportedSymbol.getName();

      if (
        !exportName.endsWith(discoveryInput.exportSuffix) ||
        exportName === discoveryInput.exportSuffix
      ) {
        continue;
      }

      const classification = classifyDocumentExport(
        exportedSymbol,
        projectContext,
        typescript,
      );

      if (classification) {
        documentCandidates.push({
          callsheetPath: buildCallsheetPath(
            discoveryInput.rootDir,
            entryModulePath,
            exportName,
            discoveryInput.exportSuffix,
          ),
          documentIdentity: classification.documentIdentity,
          entryModulePath: entryModuleFile,
          exportName,
          ...(classification.operationType === undefined
            ? {}
            : { operationType: classification.operationType }),
        });
      }
    }
  }

  return documentCandidates;
}

function getEntryModuleExports(
  entryModulePath: string,
  projectContext: ProjectContext,
): readonly ts.Symbol[] {
  const entryModule = projectContext.program.getSourceFile(entryModulePath);

  if (entryModule === undefined) {
    throw new Error(
      [
        'The configured codegen entry was not found in the provided project.',
        `  Entry: ${path.relative(process.cwd(), entryModulePath)}`,
        `  Tsconfig: ${path.relative(process.cwd(), projectContext.tsconfigFile)}`,
      ].join('\n'),
    );
  }

  const entryModuleSymbol =
    projectContext.typeChecker.getSymbolAtLocation(entryModule);

  if (entryModuleSymbol === undefined) {
    return [];
  }

  return projectContext.typeChecker.getExportsOfModule(entryModuleSymbol);
}

function classifyDocumentExport(
  symbol: ts.Symbol,
  projectContext: ProjectContext,
  typescript: typeof ts,
): { documentIdentity: string; operationType?: CallBuilderKind } | null {
  const { typeChecker } = projectContext;
  const resolvedSymbol =
    symbol.flags & typescript.SymbolFlags.Alias
      ? typeChecker.getAliasedSymbol(symbol)
      : symbol;
  const valueDeclaration = resolvedSymbol.valueDeclaration;

  if (
    valueDeclaration === undefined ||
    !typescript.isVariableDeclaration(valueDeclaration)
  ) {
    return null;
  }

  const documentInitializer = valueDeclaration.initializer;

  if (
    documentInitializer === undefined ||
    isNonDocumentInitializer(documentInitializer, typescript)
  ) {
    return null;
  }

  const valueType = typeChecker.getTypeOfSymbolAtLocation(
    resolvedSymbol,
    valueDeclaration,
  );
  const definitions = typeChecker.getPropertyOfType(valueType, 'definitions');

  if (definitions?.valueDeclaration === undefined) {
    return null;
  }

  const operationType = readOperationType(
    documentInitializer,
    symbol.getName(),
    typescript,
  );
  const documentIdentity = `${valueDeclaration.getSourceFile().fileName}:${valueDeclaration.pos}`;

  return operationType === undefined
    ? { documentIdentity }
    : { documentIdentity, operationType };
}

function isNonDocumentInitializer(
  initializer: ts.Expression,
  typescript: typeof ts,
): boolean {
  return (
    typescript.isArrowFunction(initializer) ||
    typescript.isFunctionExpression(initializer) ||
    typescript.isClassExpression(initializer) ||
    typescript.isArrayLiteralExpression(initializer) ||
    typescript.isRegularExpressionLiteral(initializer) ||
    typescript.isStringLiteralLike(initializer) ||
    typescript.isNumericLiteral(initializer) ||
    initializer.kind === typescript.SyntaxKind.TrueKeyword ||
    initializer.kind === typescript.SyntaxKind.FalseKeyword ||
    initializer.kind === typescript.SyntaxKind.NullKeyword
  );
}

function readOperationType(
  initializer: ts.Expression,
  exportName: string,
  typescript: typeof ts,
): CallBuilderKind | undefined {
  const document = skipOuterExpressions(initializer, typescript);

  if (!typescript.isObjectLiteralExpression(document)) {
    return undefined;
  }

  const definitions = getPropertyValue(document, 'definitions', typescript);

  if (
    definitions === undefined ||
    !typescript.isArrayLiteralExpression(definitions)
  ) {
    return undefined;
  }

  for (const definition of definitions.elements) {
    const operationType = readDefinitionOperationType(definition, typescript);

    if (
      operationType === QUERY_OPERATION ||
      operationType === MUTATION_OPERATION
    ) {
      return operationType;
    }

    if (operationType === SUBSCRIPTION_OPERATION) {
      throw new Error(`Subscriptions are not supported yet: ${exportName}`);
    }
  }

  return undefined;
}

function readDefinitionOperationType(
  definition: ts.Expression,
  typescript: typeof ts,
): string | undefined {
  const operationDefinition = skipOuterExpressions(definition, typescript);

  if (!typescript.isObjectLiteralExpression(operationDefinition)) {
    return undefined;
  }

  const kind = getPropertyValue(operationDefinition, 'kind', typescript);
  const operation = getPropertyValue(
    operationDefinition,
    'operation',
    typescript,
  );

  if (
    kind === undefined ||
    !typescript.isStringLiteralLike(kind) ||
    kind.text !== OPERATION_DEFINITION_KIND ||
    operation === undefined ||
    !typescript.isStringLiteralLike(operation)
  ) {
    return undefined;
  }

  return operation.text;
}

function skipOuterExpressions(
  expression: ts.Expression,
  typescript: typeof ts,
): ts.Expression {
  let current = expression;

  while (
    typescript.isAsExpression(current) ||
    typescript.isNonNullExpression(current) ||
    typescript.isParenthesizedExpression(current) ||
    typescript.isSatisfiesExpression(current) ||
    typescript.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function getPropertyValue(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
  typescript: typeof ts,
): ts.Expression | undefined {
  for (const property of objectLiteral.properties) {
    if (!typescript.isPropertyAssignment(property)) {
      continue;
    }

    const name = property.name;

    if (
      (typescript.isIdentifier(name) || typescript.isStringLiteral(name)) &&
      name.text === propertyName
    ) {
      return skipOuterExpressions(property.initializer, typescript);
    }
  }

  return undefined;
}

function buildCallsheetPath(
  rootDir: string,
  entryModulePath: string,
  exportName: string,
  exportSuffix: string,
): string[] {
  const relativeFilePath = path.relative(rootDir, entryModulePath);
  const parsed = path.parse(relativeFilePath);
  const directorySegments = parsed.dir
    .split(path.sep)
    .filter(Boolean)
    .map(toCamelCaseSegment)
    .filter(Boolean);
  const fileSegment = toCamelCaseSegment(parsed.name);
  const shouldUseFileSegment =
    fileSegment !== '' &&
    fileSegment !== 'index' &&
    !GENERIC_FILE_NAMES.has(fileSegment);
  const leaf = lowerFirst(exportName.slice(0, -exportSuffix.length));

  return shouldUseFileSegment
    ? [...directorySegments, fileSegment, leaf]
    : [...directorySegments, leaf];
}

function toCamelCaseSegment(value: string): string {
  const parts = value
    .replace(/\.[^.]+$/u, '')
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean);

  return parts
    .map((part, index) => {
      const normalized = part.toLowerCase();

      return index === 0
        ? normalized
        : normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join('');
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function finalizeDocumentDiscovery(
  documentCandidates: readonly CallsheetDocumentCandidate[],
): DiscoveredGraphQLDocument[] {
  const uniqueCandidates = dedupeEntryExports(documentCandidates);

  validateDocumentCandidates(uniqueCandidates);

  return uniqueCandidates
    .map(toDiscoveredDocument)
    .sort(compareDiscoveredDocuments);
}

function dedupeEntryExports(
  documentCandidates: readonly CallsheetDocumentCandidate[],
): CallsheetDocumentCandidate[] {
  const seenEntryExports = new Set<string>();
  const uniqueCandidates: CallsheetDocumentCandidate[] = [];

  for (const documentCandidate of documentCandidates) {
    const entryExportId = `${documentCandidate.entryModulePath}#${documentCandidate.exportName}`;

    if (!seenEntryExports.has(entryExportId)) {
      seenEntryExports.add(entryExportId);
      uniqueCandidates.push(documentCandidate);
    }
  }

  return uniqueCandidates;
}

function validateDocumentCandidates(
  documentCandidates: readonly CallsheetDocumentCandidate[],
): void {
  const seenDocuments = new Map<string, CallsheetDocumentCandidate>();

  for (const documentCandidate of documentCandidates) {
    const existingDocument = seenDocuments.get(
      documentCandidate.documentIdentity,
    );

    if (existingDocument) {
      throw new Error(
        [
          'The same GraphQL document export was discovered from multiple entry modules.',
          `  First: ${existingDocument.entryModulePath}#${existingDocument.exportName}`,
          `  Second: ${documentCandidate.entryModulePath}#${documentCandidate.exportName}`,
        ].join('\n'),
      );
    }

    seenDocuments.set(documentCandidate.documentIdentity, documentCandidate);
  }
}

function toDiscoveredDocument(
  documentCandidate: CallsheetDocumentCandidate,
): DiscoveredGraphQLDocument {
  return {
    exportName: documentCandidate.exportName,
    ...(documentCandidate.operationType === undefined
      ? {}
      : { kind: documentCandidate.operationType }),
    path: documentCandidate.callsheetPath,
    sourceFile: documentCandidate.entryModulePath,
  };
}

function compareDiscoveredDocuments(
  a: DiscoveredGraphQLDocument,
  b: DiscoveredGraphQLDocument,
): number {
  const pathComparison = compareText(
    formatCallsheetPath(a.path),
    formatCallsheetPath(b.path),
  );

  if (pathComparison !== 0) {
    return pathComparison;
  }

  const sourceFileComparison = compareText(a.sourceFile, b.sourceFile);

  if (sourceFileComparison !== 0) {
    return sourceFileComparison;
  }

  return compareText(a.exportName, b.exportName);
}

function formatCallsheetPath(pathSegments: readonly string[]): string {
  return pathSegments.join('.');
}
