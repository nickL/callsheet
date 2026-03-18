import fs from 'node:fs/promises';
import path from 'node:path';

import { discoverGraphQLDocuments } from './discovery';
import {
  buildGeneratedEntries,
  orderGeneratedEntries,
  planGeneratedModule,
  prepareGenerationConfig,
  renderModuleSource,
  toGeneratedCallsheetEntry,
  validateGeneratedEntries,
} from './generate-pipeline';

import type {
  GenerateCallsheetModuleConfig,
  GenerateCallsheetModuleResult,
} from './types';

export async function generateCallsheetModule(
  config: GenerateCallsheetModuleConfig,
): Promise<GenerateCallsheetModuleResult> {
  const preparedConfig = prepareGenerationConfig(config);
  const discoveredDocuments = await discoverGraphQLDocuments(config.discovery);
  const generatedEntriesResult = buildGeneratedEntries(
    discoveredDocuments,
    preparedConfig,
  );

  validateGeneratedEntries(generatedEntriesResult, preparedConfig);

  const orderedEntries = orderGeneratedEntries(generatedEntriesResult.entries);
  const modulePlan = planGeneratedModule(orderedEntries, preparedConfig);
  const code = renderModuleSource(preparedConfig, modulePlan);

  return {
    code,
    entries: orderedEntries.map(toGeneratedCallsheetEntry),
    outputFile: preparedConfig.outputFile,
  };
}

export async function writeCallsheetModule(
  config: GenerateCallsheetModuleConfig,
): Promise<GenerateCallsheetModuleResult> {
  const result = await generateCallsheetModule(config);

  await fs.mkdir(path.dirname(result.outputFile), { recursive: true });
  await fs.writeFile(result.outputFile, result.code, 'utf8');

  return result;
}
