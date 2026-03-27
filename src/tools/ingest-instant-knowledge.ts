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
      'Ingest structured text entries as instant knowledge files for the current task, including temporary-only form filling flows.',
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
        persist: { type: 'boolean', default: false },
      },
      required: ['entries'],
    },
    async execute(_id, params) {
      const paramsRecord =
        params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const entries = normalizeEntries(paramsRecord.entries);
      if (!entries) {
        return toToolResult(
          validationError('entries must be a non-empty array of {title, content}'),
        );
      }

      const persist = typeof paramsRecord.persist === 'boolean' ? paramsRecord.persist : false;
      const envelope = await client.post('/knowledge/instant', {
        entries,
        persist,
      });
      return toToolResult(envelope);
    },
  };
}
