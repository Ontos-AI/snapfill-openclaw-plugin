import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/core';
import { createSnapFillClient, parseSnapFillConfig } from './shared/client';
import { resolvePluginConfig } from './shared/runtime-config';
import type { SnapFillClient, ToolDefinition } from './shared/types';
import { createFinalizeJobTool } from './tools/finalize-job';
import { createGetJobResultTool } from './tools/get-job-result';
import { createGetJobStatusTool } from './tools/get-job-status';
import { createIngestInstantKnowledgeTool } from './tools/ingest-instant-knowledge';
import { createListKnowledgeFilesTool } from './tools/list-knowledge-files';
import { createListProfilesTool } from './tools/list-profiles';
import { createPrepareFileTool } from './tools/prepare-file';
import { createSubmitJobTool } from './tools/submit-job';

function createLazyClient(api: OpenClawPluginApi): SnapFillClient {
  let cached: SnapFillClient | undefined;
  const get = (): SnapFillClient => {
    if (!cached) {
      cached = createSnapFillClient(parseSnapFillConfig(resolvePluginConfig(api)));
    }
    return cached;
  };
  return {
    get: (path, query) => get().get(path, query),
    post: (path, body) => get().post(path, body),
  };
}

function createSnapFillTools(client: SnapFillClient): ToolDefinition[] {
  return [
    createPrepareFileTool(client),
    createListKnowledgeFilesTool(client),
    createListProfilesTool(client),
    createIngestInstantKnowledgeTool(client),
    createSubmitJobTool(client),
    createGetJobStatusTool(client),
    createFinalizeJobTool(client),
    createGetJobResultTool(client),
  ];
}

export default {
  id: 'snapfill-claw',
  name: 'SnapFill Plugin',
  register(api: OpenClawPluginApi): void {
    const client = createLazyClient(api);
    const tools = createSnapFillTools(client);
    api.registerTool(() => tools, {
      names: tools.map((tool) => tool.name),
      optional: true,
    });
  },
};
