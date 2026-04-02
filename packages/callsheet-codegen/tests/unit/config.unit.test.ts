import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanupTempFixtures, copyFixtureToTemp } from './test-helpers';
import {
  defineConfig,
  loadCallsheetCodegenConfig,
  toGenerateCallsheetModuleConfig,
} from '../../src/config';

describe('callsheet config', () => {
  afterEach(async () => {
    await cleanupTempFixtures();
  });

  it('returns the same config object from defineConfig', () => {
    const config = {
      sources: {
        graphql: [
          {
            rootDir: './src/graphql',
            tsconfigFile: './tsconfig.json',
            entries: ['generated.ts'],
          },
        ],
      },
      output: {
        adapter: 'react-query',
        file: './src/generated/calls.ts',
      },
    } as const;

    expect(defineConfig(config)).toBe(config);
  });

  it('loads TS config files and resolves paths from the config directory', async () => {
    const tempRoot = await copyFixtureToTemp('generate-basic');
    const configFile = path.join(tempRoot, 'callsheet.config.ts');

    const loadedConfig = await loadCallsheetCodegenConfig(configFile);
    const generateConfig = toGenerateCallsheetModuleConfig(
      loadedConfig.config,
      loadedConfig.configFilePath,
    );

    expect(loadedConfig.configFilePath).toBe(configFile);
    expect(generateConfig.sources).toEqual({
      graphql: [
        {
          entries: ['generated.ts'],
          rootDir: path.join(tempRoot, 'src/graphql'),
          tsconfigFile: path.join(tempRoot, 'tsconfig.json'),
        },
      ],
      tsRest: [
        {
          exportName: 'contract',
          importFrom: path.join(tempRoot, 'src/rest/contract'),
          pathPrefix: ['rest'],
        },
      ],
    });
    expect(generateConfig.outputFile).toBe(
      path.join(tempRoot, 'src/generated/calls.ts'),
    );
    expect(generateConfig.adapter).toBe('react-query');
    expect(generateConfig.overrides).toEqual([
      {
        path: ['featuredFilms'],
        as: ['films', 'featured'],
      },
    ]);
  });

  it('loads JS config files and resolves paths from the config directory', async () => {
    const tempRoot = await copyFixtureToTemp('generate-basic');
    const configFile = path.join(tempRoot, 'callsheet.config.js');

    await fs.writeFile(
      configFile,
      "module.exports = { sources: { graphql: [{ rootDir: './src/graphql', tsconfigFile: './tsconfig.json', entries: ['generated.ts'] }] }, output: { adapter: 'react-query', file: './src/generated/calls.ts' } };",
    );

    const loadedConfig = await loadCallsheetCodegenConfig(configFile);
    const generateConfig = toGenerateCallsheetModuleConfig(
      loadedConfig.config,
      loadedConfig.configFilePath,
    );

    expect(loadedConfig.configFilePath).toBe(configFile);
    expect(generateConfig.sources).toEqual({
      graphql: [
        {
          entries: ['generated.ts'],
          rootDir: path.join(tempRoot, 'src/graphql'),
          tsconfigFile: path.join(tempRoot, 'tsconfig.json'),
        },
      ],
    });
    expect(generateConfig.outputFile).toBe(
      path.join(tempRoot, 'src/generated/calls.ts'),
    );
    expect(generateConfig.adapter).toBe('react-query');
  });

  it('throws when config output sets both adapter and importFrom', () => {
    expect(() =>
      toGenerateCallsheetModuleConfig(
        {
          sources: {
            graphql: [],
          },
          output: {
            adapter: 'react-query',
            file: './src/generated/calls.ts',
            importFrom: '@callsheet/swr',
          },
        } as unknown as Parameters<typeof toGenerateCallsheetModuleConfig>[0],
        '/tmp/callsheet.config.ts',
      ),
    ).toThrow(
      'Callsheet codegen output target is ambiguous. Set either adapter or importFrom, not both.',
    );
  });

  it('throws when config output sets neither adapter nor importFrom', () => {
    expect(() =>
      toGenerateCallsheetModuleConfig(
        {
          sources: {
            graphql: [],
          },
          output: {
            file: './src/generated/calls.ts',
          },
        } as unknown as Parameters<typeof toGenerateCallsheetModuleConfig>[0],
        '/tmp/callsheet.config.ts',
      ),
    ).toThrow(
      'Callsheet codegen output target is required. Set either adapter or importFrom.',
    );
  });
});
