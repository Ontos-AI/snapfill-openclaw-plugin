declare module 'openclaw/plugin-sdk/core' {
  export interface AnyAgentTool {
    name: string;
    label?: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (
      toolCallId: string,
      rawParams: unknown,
    ) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>;
  }

  export interface OpenClawPluginApi {
    registerTool: (
      definition: AnyAgentTool | ((ctx: unknown) => AnyAgentTool[]),
      options?: { optional?: boolean; names?: string[] },
    ) => void;
    config?: { get?: (key: string) => unknown } | Record<string, unknown>;
    pluginConfig?: unknown;
  }
}
