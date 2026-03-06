import { validationError } from '../shared/errors';
import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

interface KnowledgeEntry {
  title: string;
  content: string;
}

function normalizeEntries(input: unknown): KnowledgeEntry[] | null {
  if (!Array.isArray(input) || input.length === 0) {
    return null;
  }

  const normalized: KnowledgeEntry[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const record = item as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    const content = typeof record.content === 'string' ? record.content.trim() : '';

    if (!title || !content) {
      return null;
    }

    normalized.push({ title, content });
  }

  return normalized;
}

export function createIngestInstantKnowledgeTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_ingest_instant_knowledge',
    description:
      'Ingest structured text entries as instant knowledge files when no usable knowledge base is available.',
    parameters: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['title', 'content'],
          },
        },
        persist: { type: 'boolean', default: true },
      },
      required: ['entries'],
    },
    async execute(_id, params) {
      const entries = normalizeEntries(params.entries);
      if (!entries) {
        return toToolResult(
          validationError('entries must be a non-empty array of {title, content}'),
        );
      }

      const persist = typeof params.persist === 'boolean' ? params.persist : true;
      const envelope = await client.post('/knowledge/instant', {
        entries,
        persist,
      });
      return toToolResult(envelope);
    },
  };
}
