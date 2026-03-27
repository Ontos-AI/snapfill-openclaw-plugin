import { validationError } from '../shared/errors';
import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

export function createFinalizeJobTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_finalize_job',
    description: 'Finalize a fill job with user-confirmed form_data.',
    parameters: {
      type: 'object',
      properties: {
        job_id: { type: 'string' },
        form_data: {
          type: 'object',
          additionalProperties: true,
          description: 'Final user-confirmed field values',
        },
      },
      required: ['job_id', 'form_data'],
    },
    async execute(_id, params) {
      const paramsRecord =
        params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const jobId = typeof paramsRecord.job_id === 'string' ? paramsRecord.job_id.trim() : '';
      const formData = paramsRecord.form_data;

      if (!jobId) {
        return toToolResult(validationError('job_id is required'));
      }
      if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
        return toToolResult(validationError('form_data must be an object'));
      }

      const envelope = await client.post(`/jobs/${jobId}/finalize`, {
        form_data: formData as Record<string, unknown>,
      });
      return toToolResult(envelope);
    },
  };
}
