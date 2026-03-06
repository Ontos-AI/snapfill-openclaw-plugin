import { SnapFillClient, ToolDefinition, toToolResult } from "../shared/types";

export function createListProfilesTool(client: SnapFillClient): ToolDefinition {
  return {
    name: "snapfill_list_profiles",
    description: "List available profiles for the current user.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute() {
      const envelope = await client.get<unknown[]>("/profiles");
      return toToolResult(envelope);
    },
  };
}
