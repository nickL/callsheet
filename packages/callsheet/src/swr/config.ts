import { useSWRConfig } from 'swr';

import type { SWRAdapterConfig } from './types';
import type { SWRConfiguration } from 'swr';

export const swrAdapterConfigKey = Symbol('callsheet.swr.config');

interface SWRConfigValue {
  [swrAdapterConfigKey]?: SWRAdapterConfig;
}

type SWRConfigWithAdapter = SWRConfiguration & SWRConfigValue;

type SWRConfigFactory = (
  parentConfig?: SWRConfiguration,
) => SWRConfiguration | undefined;

type SWRConfigFactoryWithAdapter = (
  parentConfig?: SWRConfiguration,
) => SWRConfigWithAdapter;

function mergeSWRConfigs(
  parentConfig: SWRConfiguration | undefined,
  config: SWRConfiguration | undefined,
): SWRConfiguration {
  const { provider: _parentProvider, ...parentConfigWithoutProvider } =
    parentConfig ?? {};
  const mergedConfig = {
    ...parentConfigWithoutProvider,
    ...(config ?? {}),
  };

  if (!parentConfig || !config) {
    return mergedConfig;
  }

  if (parentConfig.use && config.use) {
    mergedConfig.use = parentConfig.use.concat(config.use);
  }

  if (parentConfig.fallback && config.fallback) {
    mergedConfig.fallback = {
      ...parentConfig.fallback,
      ...config.fallback,
    };
  }

  return mergedConfig;
}

function withSWRAdapter(
  config: SWRConfiguration | undefined,
  adapter: SWRAdapterConfig,
): SWRConfigWithAdapter {
  return {
    ...(config ?? {}),
    [swrAdapterConfigKey]: adapter,
  };
}

function resolveFunctionalAdapter(
  parentConfig: SWRConfiguration | undefined,
  adapter: SWRAdapterConfig | undefined,
): SWRAdapterConfig {
  const resolvedAdapter =
    adapter ??
    (parentConfig
      ? getSWRAdapterConfig(parentConfig as SWRConfigWithAdapter)
      : undefined);

  if (resolvedAdapter) {
    return resolvedAdapter;
  }

  throw new Error(
    'withSWRConfig(...) could not resolve a Callsheet SWR adapter. Pass one explicitly or preserve the parent config.',
  );
}

export function withSWRConfig<TConfig extends SWRConfiguration | undefined>(
  config: TConfig,
  adapter: SWRAdapterConfig,
): SWRConfigWithAdapter;

export function withSWRConfig(
  config: SWRConfigFactory,
  adapter?: SWRAdapterConfig,
): SWRConfigFactoryWithAdapter;

export function withSWRConfig(
  config: SWRConfiguration | undefined | SWRConfigFactory,
  adapter?: SWRAdapterConfig,
): SWRConfigWithAdapter | SWRConfigFactoryWithAdapter {
  if (typeof config === 'function') {
    return (parentConfig?: SWRConfiguration) => {
      const resolvedAdapter = resolveFunctionalAdapter(parentConfig, adapter);
      const resolvedConfig = config(parentConfig);

      return withSWRAdapter(
        mergeSWRConfigs(parentConfig, resolvedConfig),
        resolvedAdapter,
      );
    };
  }

  if (!adapter) {
    throw new Error(
      'withSWRConfig(...) requires a Callsheet SWR adapter. Pass one explicitly.',
    );
  }

  return withSWRAdapter(config, adapter);
}

export function getSWRAdapterConfig(
  config: SWRConfiguration | SWRConfigWithAdapter,
): SWRAdapterConfig | undefined {
  return (config as SWRConfigWithAdapter)[swrAdapterConfigKey];
}

export function useSWRAdapterConfig(): SWRAdapterConfig {
  const config = useSWRConfig();
  const adapter = getSWRAdapterConfig(config);

  if (adapter) {
    return adapter;
  }

  throw new Error(
    'Unable to resolve the Callsheet SWR adapter config from SWRConfig. Wrap your tree in <SWRConfig value={withSWRConfig(...)} />.',
  );
}
