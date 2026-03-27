import { validationError } from '../shared/errors';
import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

export function createGetJobResultTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_get_job_result',
    description: 'Get final job result and download information.',
    parameters: {
      type: 'object',
      properties: {
        job_id: { type: 'string' },
      },
      required: ['job_id'],
    },
    async execute(_id, params) {
      const paramsRecord =
        params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const jobId = typeof paramsRecord.job_id === 'string' ? paramsRecord.job_id.trim() : '';
      if (!jobId) {
        return toToolResult(validationError('job_id is required'));
      }

      const envelope = await client.get(`/jobs/${jobId}/result`);
      return toToolResult(envelope);
    },
  };
}
