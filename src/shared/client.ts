import { normalizeHttpError, normalizeNetworkError, normalizeTimeoutError } from './errors';
import type { SnapFillClient, SnapFillConfig, ToolEnvelope } from './types';

export const SNAPFILL_BASE_URL =
  'https://ijnplnyv2ypeyquia4wjcrzx5q0fwdmn.lambda-url.us-west-1.on.aws/v1/fill-jobs';

const API_KEY_HELP_MESSAGE =
  'SnapFill API key is required. Get one at https://www.gosnapfill.com/home/api-key, then run openclaw config set plugins.entries.snapfill-claw.config.apiKey "sfk_..." and retry.';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizeBaseUrl(baseUrl));

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function pickTimeoutSeconds(config: SnapFillConfig): number {
  if (typeof config.timeoutSeconds === 'number' && config.timeoutSeconds > 0) {
    return config.timeoutSeconds;
  }
  return 300;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function request<T>(
  config: SnapFillConfig,
  method: 'GET' | 'POST',
  path: string,
  query?: Record<string, unknown>,
  body?: Record<string, unknown>,
): Promise<ToolEnvelope<T>> {
  const timeoutSeconds = pickTimeoutSeconds(config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    const response = await fetch(buildUrl(config.baseUrl, path, query), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const payload = await parseBody(response);
    if (!response.ok) {
      return normalizeHttpError<T>(response.status, payload);
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return normalizeTimeoutError<T>(timeoutSeconds);
    }
    return normalizeNetworkError<T>(error);
  } finally {
    clearTimeout(timeout);
  }
}

export function createSnapFillClient(config: SnapFillConfig): SnapFillClient {
  return {
    get: <T>(path: string, query?: Record<string, unknown>) =>
      request<T>(config, 'GET', path, query),
    post: <T>(path: string, body?: Record<string, unknown>) =>
      request<T>(config, 'POST', path, undefined, body),
  };
}

export function parseSnapFillConfig(rawConfig: unknown): SnapFillConfig {
  if (!rawConfig || typeof rawConfig !== 'object') {
    throw new Error(API_KEY_HELP_MESSAGE);
  }

  const cfg = rawConfig as Record<string, unknown>;
  const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';

  if (!apiKey) {
    throw new Error(API_KEY_HELP_MESSAGE);
  }

  return {
    baseUrl: SNAPFILL_BASE_URL,
    apiKey,
    timeoutSeconds: typeof cfg.timeoutSeconds === 'number' ? cfg.timeoutSeconds : undefined,
    pollIntervalMs: typeof cfg.pollIntervalMs === 'number' ? cfg.pollIntervalMs : undefined,
    maxPollAttempts: typeof cfg.maxPollAttempts === 'number' ? cfg.maxPollAttempts : undefined,
    kbPollTimeoutSeconds:
      typeof cfg.kbPollTimeoutSeconds === 'number' ? cfg.kbPollTimeoutSeconds : undefined,
  };
}
