import path from 'node:path';

import type {
  CallBuilderKind,
  DiscoveredGraphQLDocument,
  GenerateCallsheetModuleConfig,
  GeneratedCallOverride,
  GeneratedCallsheetEntry,
  ImportedCallOptionsReference,
} from './types';

export interface PreparedGenerationConfig {
  outputFile: string;
  exportName: string;
  importFrom: string;
  overridesByMatchKey: ReadonlyMap<string, GeneratedCallOverride>;
}

export interface GeneratedEntry {
  sourceFile: string;
  exportName: string;
  builder: CallBuilderKind;
  callsheetPath: readonly string[];
  options?: ImportedCallOptionsReference;
}

export interface GeneratedEntriesResult {
  entries: readonly GeneratedEntry[];
  matchedOverrideKeys: ReadonlySet<string>;
}

interface PlannedImport {
  imported: string;
  local: string;
}

interface PlannedImportGroup {
  from: string;
  imports: readonly PlannedImport[];
}

interface GeneratedModuleEntry {
  builder: CallBuilderKind;
  documentLocalName: string;
  optionsLocalName?: string;
}

export interface GeneratedModuleNode {
  children: ReadonlyMap<string, GeneratedModuleNode>;
  entry?: GeneratedModuleEntry;
}

export interface GeneratedModulePlan {
  runtimeImports: readonly PlannedImportGroup[];
  documentImports: readonly PlannedImportGroup[];
  optionImports: readonly PlannedImportGroup[];
  tree: GeneratedModuleNode;
}

interface MutableGeneratedModuleNode {
  children: Map<string, MutableGeneratedModuleNode>;
  entry?: GeneratedModuleEntry;
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

function compareCallsheetPaths(
  a: readonly string[],
  b: readonly string[],
): number {
  return compareText(formatCallsheetPath(a), formatCallsheetPath(b));
}

function createOverrideMatchKey(
  sourceFile: string,
  exportName: string,
): string {
  return `${sourceFile}#${exportName}`;
}

function toImportPath(outputFile: string, sourceFile: string): string {
  const outputDirectory = path.dirname(outputFile);
  const relative = path.relative(outputDirectory, sourceFile);
  const normalized = relative.split(path.sep).join('/');
  const withoutExtension = normalized.replace(/\.[^.]+$/u, '');

  if (withoutExtension.startsWith('.')) {
    return withoutExtension;
  }

  return `./${withoutExtension}`;
}

function createUniqueLocalName(name: string, usedNames: Set<string>): string {
  let localName = name;
  let counter = 1;

  while (usedNames.has(localName)) {
    counter += 1;
    localName = `${name}_${counter}`;
  }

  usedNames.add(localName);
  return localName;
}

export function prepareGenerationConfig(
  config: GenerateCallsheetModuleConfig,
): PreparedGenerationConfig {
  return {
    outputFile: path.resolve(process.cwd(), config.outputFile),
    exportName: config.exportName ?? 'calls',
    importFrom: config.importFrom ?? 'callsheet',
    overridesByMatchKey: buildOverrideMap(config.overrides ?? []),
  };
}

function buildOverrideMap(
  overrides: readonly GeneratedCallOverride[],
): ReadonlyMap<string, GeneratedCallOverride> {
  const overridesByMatchKey = new Map<string, GeneratedCallOverride>();

  for (const override of overrides) {
    const overrideKey = createOverrideMatchKey(
      normalizeSourceFile(override.match.sourceFile),
      override.match.exportName,
    );

    if (overridesByMatchKey.has(overrideKey)) {
      throw new Error(
        [
          'Two overrides matched the same GraphQL document export.',
          `  ${overrideKey}`,
        ].join('\n'),
      );
    }

    overridesByMatchKey.set(overrideKey, override);
  }

  return overridesByMatchKey;
}

export function buildGeneratedEntries(
  discoveredDocuments: readonly DiscoveredGraphQLDocument[],
  preparedConfig: PreparedGenerationConfig,
): GeneratedEntriesResult {
  if (discoveredDocuments.length === 0) {
    throw new Error(
      'No GraphQL document exports were discovered for the provided Callsheet codegen config.',
    );
  }

  const matchedOverrideKeys = new Set<string>();
  const entries = discoveredDocuments.map((document) =>
    buildGeneratedEntry(document, preparedConfig, matchedOverrideKeys),
  );

  return {
    entries,
    matchedOverrideKeys,
  };
}

function buildGeneratedEntry(
  document: DiscoveredGraphQLDocument,
  preparedConfig: PreparedGenerationConfig,
  matchedOverrideKeys: Set<string>,
): GeneratedEntry {
  const overrideKey = createOverrideMatchKey(
    document.sourceFile,
    document.exportName,
  );
  const override = preparedConfig.overridesByMatchKey.get(overrideKey);

  if (override) {
    matchedOverrideKeys.add(overrideKey);
  }

  const builder = override?.kind ?? document.kind;

  if (builder === undefined) {
    throw new Error(
      [
        'Could not tell if this discovered GraphQL document is a query or mutation.',
        `  ${document.sourceFile}#${document.exportName}`,
        'Add an explicit kind override for this document.',
      ].join('\n'),
    );
  }

  return {
    sourceFile: document.sourceFile,
    exportName: document.exportName,
    builder,
    callsheetPath: [...(override?.path ?? document.path)],
    ...(override?.options === undefined ? {} : { options: override.options }),
  };
}

export function validateGeneratedEntries(
  generatedEntriesResult: GeneratedEntriesResult,
  preparedConfig: PreparedGenerationConfig,
): void {
  validateGeneratedEntryPaths(generatedEntriesResult.entries);
  validateMatchedOverrides(
    generatedEntriesResult.matchedOverrideKeys,
    preparedConfig.overridesByMatchKey,
  );
}

function validateGeneratedEntryPaths(entries: readonly GeneratedEntry[]): void {
  const orderedEntries = orderGeneratedEntries(entries);
  let previousEntry: GeneratedEntry | undefined;

  for (const entry of orderedEntries) {
    if (
      entry.callsheetPath.length === 0 ||
      entry.callsheetPath.some((segment) => segment === '')
    ) {
      throw new Error(
        `Generated path is empty or invalid for ${entry.sourceFile}#${entry.exportName}.`,
      );
    }

    if (previousEntry === undefined) {
      previousEntry = entry;
      continue;
    }

    const previousPath = formatCallsheetPath(previousEntry.callsheetPath);
    const currentPath = formatCallsheetPath(entry.callsheetPath);

    if (previousPath === currentPath) {
      throw new Error(
        [
          `Two generated entries use the same path: "${currentPath}".`,
          `  First: ${previousEntry.sourceFile}#${previousEntry.exportName}`,
          `  Second: ${entry.sourceFile}#${entry.exportName}`,
          'Add an override path to separate them.',
        ].join('\n'),
      );
    }

    if (isPrefixPath(previousEntry.callsheetPath, entry.callsheetPath)) {
      throw new Error(
        [
          `Generated paths conflict: "${previousPath}" and "${currentPath}".`,
          "Callsheet can't use the same path as both a call and a namespace.",
          'Add an override path to separate them.',
        ].join('\n'),
      );
    }

    previousEntry = entry;
  }
}

function validateMatchedOverrides(
  matchedOverrideKeys: ReadonlySet<string>,
  overridesByMatchKey: ReadonlyMap<string, GeneratedCallOverride>,
): void {
  const unmatchedOverrideKeys = [...overridesByMatchKey.keys()]
    .filter((overrideKey) => !matchedOverrideKeys.has(overrideKey))
    .sort(compareText);

  if (unmatchedOverrideKeys.length === 0) {
    return;
  }

  throw new Error(
    [
      'Some overrides did not match a discovered GraphQL document export.',
      ...unmatchedOverrideKeys.map((overrideKey) => `  ${overrideKey}`),
    ].join('\n'),
  );
}

export function orderGeneratedEntries(
  entries: readonly GeneratedEntry[],
): readonly GeneratedEntry[] {
  return [...entries].sort(compareGeneratedEntries);
}

function compareGeneratedEntries(a: GeneratedEntry, b: GeneratedEntry): number {
  const callsheetPathComparison = compareCallsheetPaths(
    a.callsheetPath,
    b.callsheetPath,
  );

  if (callsheetPathComparison !== 0) {
    return callsheetPathComparison;
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

function isPrefixPath(
  parentPath: readonly string[],
  childPath: readonly string[],
): boolean {
  return (
    parentPath.length < childPath.length &&
    parentPath.every((segment, index) => segment === childPath[index])
  );
}

export function planGeneratedModule(
  entries: readonly GeneratedEntry[],
  preparedConfig: PreparedGenerationConfig,
): GeneratedModulePlan {
  const usedLocalNames = new Set<string>();
  const runtimeImports = createRuntimeImportGroups(entries, preparedConfig);
  const documentImportsByModule = new Map<string, Map<string, string>>();
  const optionImportsByModule = new Map<string, Map<string, string>>();
  const root = createMutableGeneratedModuleNode();

  for (const runtimeImportGroup of runtimeImports) {
    for (const plannedImport of runtimeImportGroup.imports) {
      usedLocalNames.add(plannedImport.local);
    }
  }

  for (const entry of entries) {
    const documentImportPath = toImportPath(
      preparedConfig.outputFile,
      path.resolve(process.cwd(), entry.sourceFile),
    );
    const documentLocalName = getOrCreateImportLocalName(
      documentImportsByModule,
      documentImportPath,
      entry.exportName,
      usedLocalNames,
    );
    const optionsLocalName =
      entry.options === undefined
        ? undefined
        : getOrCreateImportLocalName(
            optionImportsByModule,
            entry.options.from,
            entry.options.name,
            usedLocalNames,
          );

    insertGeneratedModuleEntry(root, entry.callsheetPath, {
      builder: entry.builder,
      documentLocalName,
      ...(optionsLocalName === undefined ? {} : { optionsLocalName }),
    });
  }

  return {
    runtimeImports,
    documentImports: finalizePlannedImportGroups(documentImportsByModule),
    optionImports: finalizePlannedImportGroups(optionImportsByModule),
    tree: finalizeGeneratedModuleNode(root),
  };
}

function createRuntimeImportGroups(
  entries: readonly GeneratedEntry[],
  preparedConfig: PreparedGenerationConfig,
): readonly PlannedImportGroup[] {
  const runtimeImports: PlannedImport[] = [
    {
      imported: 'defineCalls',
      local: 'defineCalls',
    },
    ...[...new Set(entries.map((entry) => entry.builder))]
      .sort(compareText)
      .map((builder) => ({
        imported: builder,
        local: builder,
      })),
  ];

  return [
    {
      from: preparedConfig.importFrom,
      imports: runtimeImports,
    },
  ];
}

function getOrCreateImportLocalName(
  importsByModule: Map<string, Map<string, string>>,
  from: string,
  imported: string,
  usedLocalNames: Set<string>,
): string {
  const plannedImports = importsByModule.get(from) ?? new Map<string, string>();
  const existingLocalName = plannedImports.get(imported);

  if (existingLocalName) {
    return existingLocalName;
  }

  const localName = createUniqueLocalName(imported, usedLocalNames);
  plannedImports.set(imported, localName);
  importsByModule.set(from, plannedImports);
  return localName;
}

function finalizePlannedImportGroups(
  importsByModule: ReadonlyMap<string, ReadonlyMap<string, string>>,
): readonly PlannedImportGroup[] {
  return [...importsByModule.entries()]
    .sort(([aFrom], [bFrom]) => compareText(aFrom, bFrom))
    .map(([from, imports]) => ({
      from,
      imports: [...imports.entries()]
        .map(([imported, local]) => ({
          imported,
          local,
        }))
        .sort(comparePlannedImports),
    }));
}

function comparePlannedImports(a: PlannedImport, b: PlannedImport): number {
  return compareText(a.imported, b.imported);
}

function createMutableGeneratedModuleNode(): MutableGeneratedModuleNode {
  return {
    children: new Map<string, MutableGeneratedModuleNode>(),
  };
}

function insertGeneratedModuleEntry(
  root: MutableGeneratedModuleNode,
  callsheetPath: readonly string[],
  entry: GeneratedModuleEntry,
): void {
  let currentNode = root;

  for (const segment of callsheetPath) {
    const nextNode =
      currentNode.children.get(segment) ?? createMutableGeneratedModuleNode();
    currentNode.children.set(segment, nextNode);
    currentNode = nextNode;
  }

  currentNode.entry = entry;
}

function finalizeGeneratedModuleNode(
  node: MutableGeneratedModuleNode,
): GeneratedModuleNode {
  const children = new Map<string, GeneratedModuleNode>(
    [...node.children.entries()]
      .sort(([aSegment], [bSegment]) => compareText(aSegment, bSegment))
      .map(([segment, childNode]) => [
        segment,
        finalizeGeneratedModuleNode(childNode),
      ]),
  );

  return node.entry === undefined
    ? {
        children,
      }
    : {
        children,
        entry: node.entry,
      };
}

export function renderModuleSource(
  preparedConfig: PreparedGenerationConfig,
  modulePlan: GeneratedModulePlan,
): string {
  const importLines = [
    ...renderImportGroups(modulePlan.runtimeImports),
    ...renderImportGroups(modulePlan.documentImports),
    ...renderImportGroups(modulePlan.optionImports),
  ];

  return [
    ...importLines,
    '',
    `export const ${preparedConfig.exportName} = defineCalls({`,
    renderGeneratedModuleNode(modulePlan.tree),
    '} as const);',
    '',
  ].join('\n');
}

function renderImportGroups(
  importGroups: readonly PlannedImportGroup[],
): string[] {
  return importGroups.map(({ from, imports }) => {
    const importList = imports
      .map(({ imported, local }) =>
        imported === local ? imported : `${imported} as ${local}`,
      )
      .join(', ');

    return `import { ${importList} } from '${from}';`;
  });
}

function renderGeneratedModuleNode(
  node: GeneratedModuleNode,
  indent = '  ',
): string {
  const lines: string[] = [];
  const nextIndent = `${indent}  `;

  for (const [segment, childNode] of node.children.entries()) {
    if (childNode.entry) {
      const optionsArgument =
        childNode.entry.optionsLocalName === undefined
          ? ''
          : `, ${childNode.entry.optionsLocalName}`;

      lines.push(
        `${indent}${JSON.stringify(segment)}: ${childNode.entry.builder}(${childNode.entry.documentLocalName}${optionsArgument}),`,
      );
      continue;
    }

    lines.push(`${indent}${JSON.stringify(segment)}: {`);
    lines.push(renderGeneratedModuleNode(childNode, nextIndent));
    lines.push(`${indent}},`);
  }

  return lines.join('\n');
}

export function toGeneratedCallsheetEntry(
  entry: GeneratedEntry,
): GeneratedCallsheetEntry {
  return {
    sourceFile: entry.sourceFile,
    exportName: entry.exportName,
    path: [...entry.callsheetPath],
    builder: entry.builder,
    ...(entry.options === undefined ? {} : { options: entry.options }),
  };
}
