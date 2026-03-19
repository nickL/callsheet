import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadCallsheetCodegenConfig,
  toGenerateCallsheetModuleConfig,
  writeCallsheetModule,
} = vi.hoisted(() => ({
  loadCallsheetCodegenConfig: vi.fn(),
  toGenerateCallsheetModuleConfig: vi.fn(),
  writeCallsheetModule: vi.fn(),
}));

vi.mock('../../src/config', () => ({
  loadCallsheetCodegenConfig,
  toGenerateCallsheetModuleConfig,
}));

vi.mock('../../src/generate', () => ({
  writeCallsheetModule,
}));

const { runCli } = await import('../../src/cli');

describe('callsheet codegen cli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prints help output', async () => {
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    await runCli(['--help']);

    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining('Usage: callsheet-codegen'),
    );
    expect(loadCallsheetCodegenConfig).not.toHaveBeenCalled();
  });

  it('loads config and writes the generated module', async () => {
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    loadCallsheetCodegenConfig.mockResolvedValue({
      config: {
        output: { file: './src/generated/calls.ts' },
        sources: { graphql: [] },
      },
      configFilePath: '/tmp/callsheet.config.ts',
    });
    toGenerateCallsheetModuleConfig.mockReturnValue({
      outputFile: '/tmp/src/generated/calls.ts',
      sources: { graphql: [] },
    });
    writeCallsheetModule.mockResolvedValue({
      code: 'export const calls = {};',
      entries: [],
      outputFile: '/tmp/src/generated/calls.ts',
    });

    await runCli(['-c', 'callsheet.config.ts']);

    expect(loadCallsheetCodegenConfig).toHaveBeenCalledWith(
      'callsheet.config.ts',
    );
    expect(toGenerateCallsheetModuleConfig).toHaveBeenCalledWith(
      {
        output: { file: './src/generated/calls.ts' },
        sources: { graphql: [] },
      },
      '/tmp/callsheet.config.ts',
    );
    expect(writeCallsheetModule).toHaveBeenCalledWith({
      outputFile: '/tmp/src/generated/calls.ts',
      sources: { graphql: [] },
    });
    expect(stdout).toHaveBeenCalledWith(
      'Generated /tmp/src/generated/calls.ts\n',
    );
  });
});
