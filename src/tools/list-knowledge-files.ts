import { validationError } from '../shared/errors';
import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

const SOURCE_SCOPES = ['all', 'temporary', 'persistent'] as const;

function normalizeKnowledgeFileIds(input: unknown): string[] | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!Array.isArray(input) || input.length === 0) {
    return undefined;
  }

  const result: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      return undefined;
    }

    const normalized = item.trim();
    if (!normalized) {
      return undefined;
    }
    result.push(normalized);
  }

  return result;
}

export function createListKnowledgeFilesTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_list_knowledge_files',
    description: 'List knowledge files and their statuses for the current user.',
    parameters: {
      type: 'object',
      properties: {
        knowledge_file_ids: {
          type: 'array',
          items: { type: 'string' },
        },
        source_scope: {
          type: 'string',
          enum: [...SOURCE_SCOPES],
          default: 'all',
        },
        page: { type: 'integer', minimum: 1, default: 1 },
        page_size: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
    async execute(_id, params) {
      const paramsRecord =
        params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const knowledgeFileIds = normalizeKnowledgeFileIds(paramsRecord.knowledge_file_ids);
      if (paramsRecord.knowledge_file_ids !== undefined && !knowledgeFileIds) {
        return toToolResult(
          validationError('knowledge_file_ids must be an array of non-empty strings'),
        );
      }

      let sourceScope: string | undefined;
      if (paramsRecord.source_scope !== undefined) {
        if (
          typeof paramsRecord.source_scope !== 'string' ||
          !SOURCE_SCOPES.includes(paramsRecord.source_scope as (typeof SOURCE_SCOPES)[number])
        ) {
          return toToolResult(validationError('source_scope must be one of all, temporary, persistent'));
        }
        sourceScope = paramsRecord.source_scope;
      }

      const page = typeof paramsRecord.page === 'number' ? paramsRecord.page : undefined;
      const pageSize =
        typeof paramsRecord.page_size === 'number' ? paramsRecord.page_size : undefined;
      const envelope = await client.get<unknown[]>('/knowledge-files', {
        knowledge_file_ids: knowledgeFileIds?.join(','),
        source_scope: sourceScope,
        page,
        page_size: pageSize,
      });
      return toToolResult(envelope);
    },
  };
}
