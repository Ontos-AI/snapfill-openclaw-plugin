import { validationError } from '../shared/errors';
import { type SnapFillClient, type ToolDefinition, toToolResult } from '../shared/types';

type PrepareAction = 'prepare' | 'confirm';

function parseAction(value: unknown): PrepareAction | null {
  if (value === 'prepare' || value === 'confirm') {
    return value;
  }
  return null;
}

export function createPrepareFileTool(client: SnapFillClient): ToolDefinition {
  return {
    name: 'snapfill_prepare_file',
    description:
      'Prepare or confirm an upload flow. Use action=prepare first, then action=confirm with upload_id after uploading bytes to storage.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['prepare', 'confirm'],
          description: 'prepare: request presigned upload; confirm: exchange upload_id for file_id',
        },
        filename: { type: 'string' },
        content_type: {
          type: 'string',
          enum: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        },
        upload_id: { type: 'string' },
      },
      required: ['action'],
    },
    async execute(_id, params) {
      const paramsRecord =
        params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const action = parseAction(paramsRecord.action);
      if (!action) {
        return toToolResult(validationError('action must be either prepare or confirm'));
      }

      if (action === 'prepare') {
        const filename =
          typeof paramsRecord.filename === 'string' ? paramsRecord.filename.trim() : '';
        const contentType =
          typeof paramsRecord.content_type === 'string' ? paramsRecord.content_type.trim() : '';

        if (!filename) {
          return toToolResult(validationError('filename is required when action=prepare'));
        }
        if (!contentType) {
          return toToolResult(validationError('content_type is required when action=prepare'));
        }

        const envelope = await client.post('/files/pre-upload', {
          filename,
          content_type: contentType,
        });
        return toToolResult(envelope);
      }

      const uploadId =
        typeof paramsRecord.upload_id === 'string' ? paramsRecord.upload_id.trim() : '';
      if (!uploadId) {
        return toToolResult(validationError('upload_id is required when action=confirm'));
      }

      const envelope = await client.post('/files/confirm-upload', {
        upload_id: uploadId,
      });
      return toToolResult(envelope);
    },
  };
}
