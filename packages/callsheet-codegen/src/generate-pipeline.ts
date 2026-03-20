import path from 'node:path';

import { discoverGraphQLDocuments } from './discovery';
import { compareText, formatPathSegments } from './internal-utils';
import { discoverTsRestRoutes } from './ts-rest-discovery';

import type {
  CallBuilderKind,
  CallsheetCodegenSourcesConfig,
  DiscoveredSourceEntry,
  GenerateCallsheetModuleConfig,
  GeneratedCallOverride,
  GeneratedCallsheetEntry,
  GeneratedCallOverrideEntry,
  GeneratedCallsheetEntryOrigin,
  ImportedCallOptionsReference,
  SourceImportReference,
} from './types';

export interface PreparedGenerationConfig {
  outputFile: string;
  exportName: string;
  importFrom: string;
  overridesByPath: ReadonlyMap<string, readonly GeneratedCallOverride[]>;
}

export interface GeneratedEntry {
  builder: CallBuilderKind;
  builderImportFrom: string;
  callsheetPath: readonly string[];
  options?: ImportedCallOptionsReference;
  origin: GeneratedCallsheetEntryOrigin;
  sourceImport: SourceImportReference;
}

export interface GeneratedEntriesResult {
  entries: readonly GeneratedEntry[];
  matchedOverridePaths: ReadonlySet<string>;
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
  builderLocalName: string;
  optionsLocalName?: string;
  sourceExpression: string;
}

export interface GeneratedModuleNode {
  children: ReadonlyMap<string, GeneratedModuleNode>;
  entry?: GeneratedModuleEntry;
}

export interface GeneratedModulePlan {
  optionImports: readonly PlannedImportGroup[];
  runtimeImports: readonly PlannedImportGroup[];
  sourceImports: readonly PlannedImportGroup[];
  tree: GeneratedModuleNode;
}

interface MutableGeneratedModuleNode {
  children: Map<string, MutableGeneratedModuleNode>;
  entry?: GeneratedModuleEntry;
}

function createOverridePathKey(pathSegments: readonly string[]): string {
  return formatPathSegments(pathSegments);
}

function isIdentifierSegment(segment: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/u.test(segment);
}

function formatOrigin(origin: GeneratedCallsheetEntryOrigin): string {
  switch (origin.kind) {
    case 'graphqlDocument':
      return `${origin.sourceFile}#${origin.exportName}`;
    case 'tsRestRoute':
      return `${origin.sourceFile}#${origin.exportName}.${formatPathSegments(origin.routePath)}`;
  }
}

function formatOverrideEntry(entry: GeneratedCallOverrideEntry): string {
  switch (entry.kind) {
    case 'graphqlDocument':
      return `${entry.sourceFile}#${entry.exportName}`;
    case 'tsRestRoute':
      return `${entry.sourceFile}#${entry.exportName}.${formatPathSegments(entry.routePath)}`;
  }
}

function matchesOverrideEntry(
  overrideEntry: GeneratedCallOverrideEntry,
  origin: GeneratedCallsheetEntryOrigin,
): boolean {
  switch (overrideEntry.kind) {
    case 'graphqlDocument':
      return (
        origin.kind === 'graphqlDocument' &&
        origin.sourceFile === overrideEntry.sourceFile &&
        origin.exportName === overrideEntry.exportName
      );
    case 'tsRestRoute':
      return (
        origin.kind === 'tsRestRoute' &&
        origin.sourceFile === overrideEntry.sourceFile &&
        origin.exportName === overrideEntry.exportName &&
        compareCallsheetPaths(origin.routePath, overrideEntry.routePath) === 0
      );
  }
}

function compareOrigins(
  a: GeneratedCallsheetEntryOrigin,
  b: GeneratedCallsheetEntryOrigin,
): number {
  return compareText(formatOrigin(a), formatOrigin(b));
}

function compareCallsheetPaths(
  a: readonly string[],
  b: readonly string[],
): number {
  return compareText(formatPathSegments(a), formatPathSegments(b));
}

function toImportPath(outputFile: string, filePath: string): string {
  const outputDirectory = path.dirname(outputFile);
  const relative = path.relative(outputDirectory, filePath);
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

function renderSourceExpression(
  localName: string,
  memberPath?: readonly string[],
): string {
  if (memberPath === undefined || memberPath.length === 0) {
    return localName;
  }

  return memberPath.reduce(
    (expression, segment) =>
      isIdentifierSegment(segment)
        ? `${expression}.${segment}`
        : `${expression}[${JSON.stringify(segment)}]`,
    localName,
  );
}

export function prepareGenerationConfig(
  config: GenerateCallsheetModuleConfig,
): PreparedGenerationConfig {
  return {
    outputFile: path.resolve(process.cwd(), config.outputFile),
    exportName: config.exportName ?? 'calls',
    importFrom: config.importFrom ?? '@callsheet/react-query',
    overridesByPath: buildOverrideMap(config.overrides ?? []),
  };
}

function buildOverrideMap(
  overrides: readonly GeneratedCallOverride[],
): ReadonlyMap<string, readonly GeneratedCallOverride[]> {
  const overridesByPath = new Map<string, GeneratedCallOverride[]>();

  for (const override of overrides) {
    const overrideKey = createOverridePathKey(override.path);
    const existingOverrides = overridesByPath.get(overrideKey) ?? [];
    const duplicateOverride = existingOverrides.find((existingOverride) =>
      isSameOverrideEntry(existingOverride.entry, override.entry),
    );

    if (duplicateOverride) {
      const duplicateMessage =
        override.entry === undefined
          ? 'Two overrides target the same generated path.'
          : 'Two overrides target the same generated path and entry.';

      throw new Error(
        [duplicateMessage, `  ${formatOverrideLabel(override)}`].join('\n'),
      );
    }

    existingOverrides.push(override);
    overridesByPath.set(overrideKey, existingOverrides);
  }

  return overridesByPath;
}

function isSameOverrideEntry(
  a?: GeneratedCallOverrideEntry,
  b?: GeneratedCallOverrideEntry,
): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }

  return formatOverrideEntry(a) === formatOverrideEntry(b);
}

function formatOverrideLabel(override: GeneratedCallOverride): string {
  return override.entry === undefined
    ? createOverridePathKey(override.path)
    : `${createOverridePathKey(override.path)} (${formatOverrideEntry(override.entry)})`;
}

export async function discoverConfiguredSourceEntries(
  sources: CallsheetCodegenSourcesConfig,
  preparedConfig: PreparedGenerationConfig,
): Promise<DiscoveredSourceEntry[]> {
  const discoveredEntries: DiscoveredSourceEntry[] = [];

  if (sources.graphql?.length) {
    const discoveredDocuments = await discoverGraphQLDocuments(sources.graphql);

    discoveredEntries.push(
      ...discoveredDocuments.map((document) =>
        toGraphQLSourceEntry(document, preparedConfig.importFrom),
      ),
    );
  }

  if (sources.tsRest?.length) {
    const discoveredRoutes = await discoverTsRestRoutes(sources.tsRest);

    discoveredEntries.push(...discoveredRoutes.map(toTsRestSourceEntry));
  }

  return discoveredEntries;
}

function toGraphQLSourceEntry(
  document: Awaited<ReturnType<typeof discoverGraphQLDocuments>>[number],
  builderImportFrom: string,
): DiscoveredSourceEntry {
  return {
    builderImportFrom,
    ...(document.kind === undefined ? {} : { kind: document.kind }),
    origin: {
      kind: 'graphqlDocument',
      exportName: document.exportName,
      sourceFile: document.sourceFile,
    },
    path: [...document.path],
    sourceImport: {
      filePath: path.resolve(process.cwd(), document.sourceFile),
      name: document.exportName,
    },
  };
}

function toTsRestSourceEntry(
  route: Awaited<ReturnType<typeof discoverTsRestRoutes>>[number],
): DiscoveredSourceEntry {
  return {
    builderImportFrom: '@callsheet/ts-rest',
    kind: route.kind,
    origin: {
      kind: 'tsRestRoute',
      exportName: route.exportName,
      routePath: route.routePath,
      sourceFile: route.sourceFile,
    },
    path: [...route.path],
    sourceImport: {
      filePath: path.resolve(process.cwd(), route.sourceFile),
      memberPath: route.routePath,
      name: route.exportName,
    },
  };
}

export function buildGeneratedEntries(
  discoveredEntries: readonly DiscoveredSourceEntry[],
  preparedConfig: PreparedGenerationConfig,
): GeneratedEntriesResult {
  if (discoveredEntries.length === 0) {
    throw new Error(
      'No Callsheet source entries were discovered for the provided Callsheet codegen config.',
    );
  }

  const matchedOverridePaths = new Set<string>();
  const entries = discoveredEntries.map((entry) =>
    buildGeneratedEntry(entry, preparedConfig, matchedOverridePaths),
  );

  return {
    entries,
    matchedOverridePaths,
  };
}

function buildGeneratedEntry(
  entry: DiscoveredSourceEntry,
  preparedConfig: PreparedGenerationConfig,
  matchedOverridePaths: Set<string>,
): GeneratedEntry {
  const overridePathKey = createOverridePathKey(entry.path);
  const override = resolveOverride(
    preparedConfig.overridesByPath.get(overridePathKey),
    entry.origin,
  );

  if (override) {
    matchedOverridePaths.add(formatOverrideLabel(override));
  }

  const builder = override?.kind ?? entry.kind;

  if (builder === undefined) {
    throw new Error(
      [
        'Could not tell whether this discovered entry should use a query or mutation builder.',
        `  Path: ${formatPathSegments(entry.path)}`,
        `  Origin: ${formatOrigin(entry.origin)}`,
        'Add an explicit kind override for this generated path.',
      ].join('\n'),
    );
  }

  return {
    builder,
    builderImportFrom: entry.builderImportFrom,
    callsheetPath: [...(override?.as ?? entry.path)],
    ...(override?.options === undefined ? {} : { options: override.options }),
    origin: entry.origin,
    sourceImport: entry.sourceImport,
  };
}

export function validateGeneratedEntries(
  generatedEntriesResult: GeneratedEntriesResult,
  preparedConfig: PreparedGenerationConfig,
): void {
  validateGeneratedEntryPaths(generatedEntriesResult.entries);
  validateMatchedOverrides(
    generatedEntriesResult.matchedOverridePaths,
    preparedConfig.overridesByPath,
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
        [
          `Generated path is empty or invalid: "${formatPathSegments(entry.callsheetPath)}".`,
          `  Origin: ${formatOrigin(entry.origin)}`,
        ].join('\n'),
      );
    }

    if (previousEntry === undefined) {
      previousEntry = entry;
      continue;
    }

    const previousPath = formatPathSegments(previousEntry.callsheetPath);
    const currentPath = formatPathSegments(entry.callsheetPath);

    if (previousPath === currentPath) {
      throw new Error(
        [
          `Two generated entries use the same path: "${currentPath}".`,
          `  First: ${formatOrigin(previousEntry.origin)}`,
          `  Second: ${formatOrigin(entry.origin)}`,
          'Add an alias with `as` to separate them.',
        ].join('\n'),
      );
    }

    if (isPrefixPath(previousEntry.callsheetPath, entry.callsheetPath)) {
      throw new Error(
        [
          `Generated paths conflict: "${previousPath}" and "${currentPath}".`,
          "Callsheet can't use the same path as both a call and a namespace.",
          'Add an alias with `as` to separate them.',
        ].join('\n'),
      );
    }

    previousEntry = entry;
  }
}

function validateMatchedOverrides(
  matchedOverridePaths: ReadonlySet<string>,
  overridesByPath: ReadonlyMap<string, readonly GeneratedCallOverride[]>,
): void {
  const unmatchedOverridePaths = [...overridesByPath.values()]
    .flat()
    .map(formatOverrideLabel)
    .filter((overrideLabel) => !matchedOverridePaths.has(overrideLabel))
    .sort(compareText);

  if (unmatchedOverridePaths.length === 0) {
    return;
  }

  throw new Error(
    [
      'Some overrides did not match a generated path.',
      ...unmatchedOverridePaths.map((overridePath) => `  ${overridePath}`),
    ].join('\n'),
  );
}

function resolveOverride(
  overrides: readonly GeneratedCallOverride[] | undefined,
  origin: GeneratedCallsheetEntryOrigin,
): GeneratedCallOverride | undefined {
  if (overrides === undefined) {
    return undefined;
  }

  return (
    overrides.find(
      (override) =>
        override.entry !== undefined &&
        matchesOverrideEntry(override.entry, origin),
    ) ?? overrides.find((override) => override.entry === undefined)
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

  return compareOrigins(a.origin, b.origin);
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
  const runtimeImportsByModule = new Map<string, Map<string, string>>();
  const sourceImportsByModule = new Map<string, Map<string, string>>();
  const optionImportsByModule = new Map<string, Map<string, string>>();
  const root = createMutableGeneratedModuleNode();

  getOrCreateImportLocalName(
    runtimeImportsByModule,
    preparedConfig.importFrom,
    'defineCalls',
    usedLocalNames,
  );

  for (const entry of entries) {
    const builderLocalName = getOrCreateImportLocalName(
      runtimeImportsByModule,
      entry.builderImportFrom,
      entry.builder,
      usedLocalNames,
    );
    const sourceImportPath = toImportPath(
      preparedConfig.outputFile,
      entry.sourceImport.filePath,
    );
    const sourceLocalName = getOrCreateImportLocalName(
      sourceImportsByModule,
      sourceImportPath,
      entry.sourceImport.name,
      usedLocalNames,
    );
    const sourceExpression = renderSourceExpression(
      sourceLocalName,
      entry.sourceImport.memberPath,
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
      builderLocalName,
      ...(optionsLocalName === undefined ? {} : { optionsLocalName }),
      sourceExpression,
    });
  }

  return {
    optionImports: finalizePlannedImportGroups(optionImportsByModule),
    runtimeImports: finalizePlannedImportGroups(runtimeImportsByModule),
    sourceImports: finalizePlannedImportGroups(sourceImportsByModule),
    tree: finalizeGeneratedModuleNode(root),
  };
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
    ...renderImportGroups(modulePlan.sourceImports),
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
        `${indent}${JSON.stringify(segment)}: ${childNode.entry.builderLocalName}(${childNode.entry.sourceExpression}${optionsArgument}),`,
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
    builder: entry.builder,
    origin: entry.origin,
    path: [...entry.callsheetPath],
    ...(entry.options === undefined ? {} : { options: entry.options }),
  };
}
