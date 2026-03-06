import { createSnapFillClient, parseSnapFillConfig } from './shared/client';
import type { OpenClawApi } from './shared/types';
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
    throw new Error('OpenClaw config accessor is unavailable');
  }

  return (
    api.config.get('plugins.entries.snapfill.config') ??
    api.config.get('plugins.snapfill.config') ??
    api.config.get('snapfill')
  );
}

export default function register(api: OpenClawApi): void {
  const config = parseSnapFillConfig(readPluginConfig(api));
  const client = createSnapFillClient(config);

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
