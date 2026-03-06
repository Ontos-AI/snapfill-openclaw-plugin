import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

export function createListKnowledgeFilesTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_list_knowledge_files',
    description: 'List knowledge files and their statuses for the current user.',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        page_size: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
    async execute(_id, params) {
      const page = typeof params.page === 'number' ? params.page : undefined;
      const pageSize = typeof params.page_size === 'number' ? params.page_size : undefined;
      const envelope = await client.get<unknown[]>('/knowledge-files', {
        page,
        page_size: pageSize,
      });
      return toToolResult(envelope);
    },
  };
}
