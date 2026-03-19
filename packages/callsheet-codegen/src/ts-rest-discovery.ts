import path from 'node:path';

import { createJiti } from 'jiti';

import {
  compareText,
  formatPathSegments,
  isObjectRecord,
  normalizeSourceFile,
  toArray,
} from './internal-utils';

import type {
  CallBuilderKind,
  DiscoveredTsRestRoute,
  TsRestContractDiscoveryInput,
} from './types';

interface ResolvedDiscoveryInput {
  exportName: string;
  importFrom: string;
  pathPrefix: readonly string[];
}

interface TsRestRoute {
  method: string;
  path: string;
  responses: Record<number, unknown>;
}

interface TsRestCoreModule {
  isAppRoute(value: unknown): value is TsRestRoute;
  isAppRouteQuery(route: TsRestRoute): boolean;
}

export async function discoverTsRestRoutes(
  input: TsRestContractDiscoveryInput | readonly TsRestContractDiscoveryInput[],
): Promise<DiscoveredTsRestRoute[]> {
  const discoveryInputs = buildDiscoveryInputs(input);
  const tsRestCore = await loadTsRestCore();
  const discoveredRoutes: DiscoveredTsRestRoute[] = [];

  for (const discoveryInput of discoveryInputs) {
    discoveredRoutes.push(
      ...(await collectContractRoutes(discoveryInput, tsRestCore)),
    );
  }

  return [...discoveredRoutes].sort(compareDiscoveredRoutes);
}

function buildDiscoveryInputs(
  input: TsRestContractDiscoveryInput | readonly TsRestContractDiscoveryInput[],
): ResolvedDiscoveryInput[] {
  const rawInputs = toArray(input);

  return rawInputs.map((config) => ({
    exportName: config.exportName,
    importFrom: path.resolve(process.cwd(), config.importFrom),
    pathPrefix: config.pathPrefix ?? [],
  }));
}

async function loadTsRestCore(): Promise<TsRestCoreModule> {
  try {
    const module = (await import('@ts-rest/core')) as TsRestCoreModule;

    return {
      isAppRoute: (value) => module.isAppRoute(value),
      isAppRouteQuery: (route) => module.isAppRouteQuery(route),
    };
  } catch {
    throw new Error(
      'Callsheet codegen requires `@ts-rest/core` to generate from tsRest sources.',
    );
  }
}

async function collectContractRoutes(
  discoveryInput: ResolvedDiscoveryInput,
  tsRestCore: TsRestCoreModule,
): Promise<DiscoveredTsRestRoute[]> {
  const { contract, resolvedImportPath } =
    await loadContractExport(discoveryInput);
  const contractRoutes: DiscoveredTsRestRoute[] = [];

  if (tsRestCore.isAppRoute(contract)) {
    throw new Error(
      [
        'Configured tsRest export must be a contract router object.',
        `  ${resolvedImportPath}#${discoveryInput.exportName}`,
      ].join('\n'),
    );
  }

  walkContractRoutes(
    contract,
    [],
    discoveryInput,
    normalizeSourceFile(resolvedImportPath),
    tsRestCore,
    contractRoutes,
  );

  return contractRoutes;
}

async function loadContractExport(
  discoveryInput: ResolvedDiscoveryInput,
): Promise<{ contract: Record<string, unknown>; resolvedImportPath: string }> {
  const loader = createJiti(discoveryInput.importFrom);
  const resolvedImportPath = loader.resolve(discoveryInput.importFrom);
  const loadedModule = await loader.import(resolvedImportPath);
  const contractExport = readModuleExport(loadedModule, discoveryInput);

  if (!isObjectRecord(contractExport)) {
    throw new Error(
      [
        'Configured tsRest export must be a contract router object.',
        `  ${resolvedImportPath}#${discoveryInput.exportName}`,
      ].join('\n'),
    );
  }

  return {
    contract: contractExport,
    resolvedImportPath,
  };
}

function readModuleExport(
  loadedModule: unknown,
  discoveryInput: ResolvedDiscoveryInput,
): unknown {
  if (
    isObjectRecord(loadedModule) &&
    discoveryInput.exportName in loadedModule
  ) {
    return loadedModule[discoveryInput.exportName];
  }

  throw new Error(
    [
      'Configured tsRest export was not found.',
      `  ${discoveryInput.importFrom}#${discoveryInput.exportName}`,
    ].join('\n'),
  );
}

function walkContractRoutes(
  contractNode: Record<string, unknown>,
  routePath: readonly string[],
  discoveryInput: ResolvedDiscoveryInput,
  sourceFile: string,
  tsRestCore: TsRestCoreModule,
  discoveredRoutes: DiscoveredTsRestRoute[],
): void {
  for (const [segment, value] of Object.entries(contractNode)) {
    const nextRoutePath = [...routePath, segment];

    if (tsRestCore.isAppRoute(value)) {
      discoveredRoutes.push({
        exportName: discoveryInput.exportName,
        kind: classifyRouteKind(value, tsRestCore),
        path: [...discoveryInput.pathPrefix, ...nextRoutePath],
        routePath: nextRoutePath,
        sourceFile,
      });
      continue;
    }

    if (!isObjectRecord(value)) {
      throw new Error(
        [
          'The configured tsRest contract contains a value that is not a route.',
          `  ${sourceFile}#${discoveryInput.exportName}.${formatPathSegments(nextRoutePath)}`,
        ].join('\n'),
      );
    }

    walkContractRoutes(
      value,
      nextRoutePath,
      discoveryInput,
      sourceFile,
      tsRestCore,
      discoveredRoutes,
    );
  }
}

function classifyRouteKind(
  route: TsRestRoute,
  tsRestCore: TsRestCoreModule,
): CallBuilderKind {
  return tsRestCore.isAppRouteQuery(route) ? 'query' : 'mutation';
}

function compareDiscoveredRoutes(
  a: DiscoveredTsRestRoute,
  b: DiscoveredTsRestRoute,
): number {
  const pathComparison = compareText(
    formatPathSegments(a.path),
    formatPathSegments(b.path),
  );

  if (pathComparison !== 0) {
    return pathComparison;
  }

  return compareText(
    `${a.sourceFile}#${a.exportName}.${formatPathSegments(a.routePath)}`,
    `${b.sourceFile}#${b.exportName}.${formatPathSegments(b.routePath)}`,
  );
}
