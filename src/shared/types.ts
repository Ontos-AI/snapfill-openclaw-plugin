export interface SnapFillConfig {
  baseUrl: string;
  apiKey: string;
  timeoutSeconds?: number;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  kbPollTimeoutSeconds?: number;
}

export interface ToolError {
  http_status: number;
  code: string;
  message: string;
  retryable: boolean;
  user_message: string;
}

export type ToolEnvelope<T = unknown> = { ok: true; data: T } | { ok: false; error: ToolError };

export interface ToolExecutionResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (id: string, params: Record<string, unknown>) => Promise<ToolExecutionResult>;
}

export interface OpenClawConfigAccessor {
  get: (key: string) => unknown;
}

export interface OpenClawApi {
  registerTool: (definition: ToolDefinition, options?: { optional?: boolean }) => void;
  config?: OpenClawConfigAccessor;
}

export interface SnapFillClient {
  get: <T>(path: string, query?: Record<string, unknown>) => Promise<ToolEnvelope<T>>;
  post: <T>(path: string, body?: Record<string, unknown>) => Promise<ToolEnvelope<T>>;
}

export function toToolResult<T>(envelope: ToolEnvelope<T>): ToolExecutionResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(envelope) }],
    isError: !envelope.ok,
  };
}
