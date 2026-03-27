import { validationError } from '../shared/errors';
import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

const KNOWLEDGE_STRATEGIES = ['auto', 'existing_only', 'temporary_only'] as const;

function normalizeKnowledgeFileIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0) {
    return null;
  }

  const result: string[] = [];
  for (const id of input) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }
    result.push(id.trim());
  }

  return result;
}

export function createSubmitJobTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_submit_job',
    description: 'Submit a SnapFill fill job and return a job_id.',
    parameters: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'Source file ID from upload flow',
        },
        mode: {
          type: 'string',
          enum: ['confirm_required'],
        },
        knowledge_file_ids: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
        },
        profile_id: {
          type: 'string',
        },
        knowledge_strategy: {
          type: 'string',
          enum: [...KNOWLEDGE_STRATEGIES],
          default: 'auto',
        },
      },
      required: ['file_id', 'mode', 'knowledge_file_ids'],
    },
    async execute(_id, params) {
      const paramsRecord =
        params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const fileId = typeof paramsRecord.file_id === 'string' ? paramsRecord.file_id.trim() : '';
      const mode = typeof paramsRecord.mode === 'string' ? paramsRecord.mode : '';
      const knowledgeFileIds = normalizeKnowledgeFileIds(paramsRecord.knowledge_file_ids);

      if (!fileId) {
        return toToolResult(validationError('file_id is required'));
      }
      if (mode !== 'confirm_required') {
        return toToolResult(validationError('mode must be confirm_required'));
      }
      if (!knowledgeFileIds) {
        return toToolResult(validationError('knowledge_file_ids must be a non-empty string array'));
      }

      const knowledgeStrategy =
        typeof paramsRecord.knowledge_strategy === 'string'
          ? paramsRecord.knowledge_strategy.trim()
          : 'auto';
      if (!KNOWLEDGE_STRATEGIES.includes(knowledgeStrategy as (typeof KNOWLEDGE_STRATEGIES)[number])) {
        return toToolResult(
          validationError('knowledge_strategy must be one of auto, existing_only, temporary_only'),
        );
      }

      const profileId =
        typeof paramsRecord.profile_id === 'string' && paramsRecord.profile_id.trim().length > 0
          ? paramsRecord.profile_id.trim()
          : undefined;

      const envelope = await client.post('/jobs', {
        source: {
          type: 'file_id',
          file_id: fileId,
        },
        knowledge: {
          knowledge_file_ids: knowledgeFileIds,
          profile_id: knowledgeStrategy === 'temporary_only' ? undefined : profileId,
          strategy: knowledgeStrategy,
        },
        mode,
      });

      return toToolResult(envelope);
    },
  };
}
