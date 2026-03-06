import { validationError } from "../shared/errors";
import { SnapFillClient, ToolDefinition, toToolResult } from "../shared/types";

export function createGetJobResultTool(client: SnapFillClient): ToolDefinition {
  return {
    name: "snapfill_get_job_result",
    description: "Get final job result and download information.",
    parameters: {
      type: "object",
      properties: {
        job_id: { type: "string" },
      },
      required: ["job_id"],
    },
    async execute(_id, params) {
      const jobId = typeof params.job_id === "string" ? params.job_id.trim() : "";
      if (!jobId) {
        return toToolResult(validationError("job_id is required"));
      }

      const envelope = await client.get(`/jobs/${jobId}/result`);
      return toToolResult(envelope);
    },
  };
}
