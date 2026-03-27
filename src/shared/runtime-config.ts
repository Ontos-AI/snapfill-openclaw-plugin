import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/core';

const CURRENT_PLUGIN_ID = 'snapfill-claw';
const LEGACY_PLUGIN_ID = 'snapfill';

const KNOWN_CONFIG_KEYS = [
  'apiKey',
  'timeoutSeconds',
  'pollIntervalMs',
  'maxPollAttempts',
  'kbPollTimeoutSeconds',
] as const;

type StringRecord = Record<string, unknown>;

function isRecord(value: unknown): value is StringRecord {
  return typeof value === 'object' && value !== null;
}

function hasGetter(value: unknown): value is { get: (key: string) => unknown } {
  return isRecord(value) && typeof value.get === 'function';
}

function hasKnownConfigKeys(value: StringRecord): boolean {
  return KNOWN_CONFIG_KEYS.some((key) => key in value);
}

function getPath(record: StringRecord, path: string): unknown {
  let current: unknown = record;
  for (const segment of path.split('.')) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function readFromAccessor(config: { get: (key: string) => unknown }): unknown {
  return (
    config.get(`plugins.entries.${CURRENT_PLUGIN_ID}.config`) ??
    config.get(`plugins.${CURRENT_PLUGIN_ID}.config`) ??
    config.get(CURRENT_PLUGIN_ID) ??
    config.get(`plugins.entries.${LEGACY_PLUGIN_ID}.config`) ??
    config.get(`plugins.${LEGACY_PLUGIN_ID}.config`) ??
    config.get(LEGACY_PLUGIN_ID)
  );
}

function readFromPlainObject(config: StringRecord): unknown {
  const nested =
    getPath(config, `plugins.entries.${CURRENT_PLUGIN_ID}.config`) ??
    getPath(config, `plugins.${CURRENT_PLUGIN_ID}.config`) ??
    getPath(config, CURRENT_PLUGIN_ID) ??
    getPath(config, `plugins.entries.${LEGACY_PLUGIN_ID}.config`) ??
    getPath(config, `plugins.${LEGACY_PLUGIN_ID}.config`) ??
    getPath(config, LEGACY_PLUGIN_ID);

  if (nested !== undefined) {
    return nested;
  }

  return hasKnownConfigKeys(config) ? config : undefined;
}

export function resolvePluginConfig(api: OpenClawPluginApi): unknown {
  if (isRecord(api.pluginConfig)) {
    return api.pluginConfig;
  }

  if (!api.config) {
    return undefined;
  }

  if (hasGetter(api.config)) {
    return readFromAccessor(api.config);
  }

  if (isRecord(api.config)) {
    return readFromPlainObject(api.config);
  }

  return undefined;
}
