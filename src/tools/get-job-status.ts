import { validationError } from '../shared/errors';
import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

interface JobStatusPayload {
  status?: string;
  field_suggestions?: unknown;
  fillchart_fields?: unknown;
  preview?: { fields?: unknown };
  fillchart_fields_snapshot?: unknown;
  [key: string]: unknown;
}

function normalizeFieldSuggestions(payload: JobStatusPayload): unknown {
  if (payload.field_suggestions !== undefined) {
    return payload.field_suggestions;
  }
  if (payload.fillchart_fields !== undefined) {
    return payload.fillchart_fields;
  }
  if (payload.preview && payload.preview.fields !== undefined) {
    return payload.preview.fields;
  }
  if (payload.fillchart_fields_snapshot !== undefined) {
    return payload.fillchart_fields_snapshot;
  }
  return [];
}

export function createGetJobStatusTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_get_job_status',
    description: 'Get current job status, progress and stage info.',
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

      const envelope = await client.get<JobStatusPayload>(`/jobs/${jobId}/status`);
      if (!envelope.ok) {
        return toToolResult(envelope);
      }

      const payload = envelope.data;
      const enriched: JobStatusPayload = {
        ...payload,
        field_suggestions: normalizeFieldSuggestions(payload),
      };

      return toToolResult({ ok: true, data: enriched });
    },
  };
}
