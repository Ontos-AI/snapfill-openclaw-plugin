import { createSnapFillClient, parseSnapFillConfig } from './shared/client';
import type { OpenClawApi, SnapFillClient } from './shared/types';
import { createFinalizeJobTool } from './tools/finalize-job';
import { createGetJobResultTool } from './tools/get-job-result';
import { createGetJobStatusTool } from './tools/get-job-status';
import { createIngestInstantKnowledgeTool } from './tools/ingest-instant-knowledge';
import { createListKnowledgeFilesTool } from './tools/list-knowledge-files';
import { createListProfilesTool } from './tools/list-profiles';
import { createPrepareFileTool } from './tools/prepare-file';
import { createSubmitJobTool } from './tools/submit-job';

function readPluginConfig(api: OpenClawApi): unknown {
  if (!api.config || typeof api.config.get !== 'function') {
    return undefined;
  }

  return (
    api.config.get('plugins.entries.snapfill.config') ??
    api.config.get('plugins.snapfill.config') ??
    api.config.get('snapfill')
  );
}

function createLazyClient(api: OpenClawApi): SnapFillClient {
  let cached: SnapFillClient | undefined;
  const get = (): SnapFillClient => {
    if (!cached) {
      cached = createSnapFillClient(parseSnapFillConfig(readPluginConfig(api)));
    }
    return cached;
  };
  return {
    get: (path, query) => get().get(path, query),
    post: (path, body) => get().post(path, body),
  };
}

export default function register(api: OpenClawApi): void {
  const client = createLazyClient(api);

  const tools = [
    createPrepareFileTool(client),
    createListKnowledgeFilesTool(client),
    createListProfilesTool(client),
    createIngestInstantKnowledgeTool(client),
    createSubmitJobTool(client),
    createGetJobStatusTool(client),
    createFinalizeJobTool(client),
    createGetJobResultTool(client),
  ];

  for (const tool of tools) {
    api.registerTool(tool, { optional: true });
  }
}

