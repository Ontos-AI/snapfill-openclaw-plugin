import fs from 'node:fs';
import path from 'node:path';
import { parseSnapFillConfig, SNAPFILL_BASE_URL } from '../src/shared/client';
import { normalizeHttpError, normalizeTimeoutError, validationError } from '../src/shared/errors';
import type { SnapFillClient, ToolEnvelope, ToolExecutionResult } from '../src/shared/types';
import { resolvePluginConfig } from '../src/shared/runtime-config';
import { createListKnowledgeFilesTool } from '../src/tools/list-knowledge-files';
import { createSubmitJobTool } from '../src/tools/submit-job';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function parseEnvelope(result: ToolExecutionResult): ToolEnvelope {
  const firstContent = result.content[0];
  assert(firstContent?.type === 'text', 'tool result should contain text content');
  return JSON.parse(firstContent.text) as ToolEnvelope;
}

function testErrorMapping(): void {
  const mapped = normalizeHttpError(400, {
    code: 'KNOWLEDGE_SOURCE_REQUIRED',
    message: 'kb missing',
  });

  assert(!mapped.ok, 'normalizeHttpError should return error envelope');
  assert(
    mapped.error.user_message.includes('未找到可用知识库'),
    'knowledge-required code should map to user-facing knowledge guidance',
  );

  const timeout = normalizeTimeoutError(15);
  assert(!timeout.ok, 'normalizeTimeoutError should return error envelope');
  assert(timeout.error.code === 'TASK_TIMEOUT', 'timeout should map to TASK_TIMEOUT');
  assert(timeout.error.retryable, 'TASK_TIMEOUT should be retryable');

  const unknown = normalizeHttpError(400, { code: 'SOMETHING_NEW', message: 'boom' });
  assert(!unknown.ok, 'unknown code should still be error envelope');
  assert(
    unknown.error.user_message.includes('操作失败'),
    'unknown code should map to fallback user message',
  );

  const strategyMismatch = normalizeHttpError(422, {
    code: 'KNOWLEDGE_STRATEGY_MISMATCH',
    message: 'mixed knowledge kinds',
  });
  assert(!strategyMismatch.ok, 'strategy mismatch should be error envelope');
  assert(
    strategyMismatch.error.user_message.includes('知识来源和要求不一致'),
    'knowledge strategy mismatch should map to a specific user message',
  );

  const formMismatch = normalizeHttpError(422, {
    code: 'FORM_DATA_FIELD_MISMATCH',
    message: 'field mismatch',
  });
  assert(!formMismatch.ok, 'form mismatch should be error envelope');
  assert(
    formMismatch.error.user_message.includes('字段名没有匹配到表格字段'),
    'form mismatch should map to a specific user message',
  );
}

function testConfigParsing(): void {
  const parsed = parseSnapFillConfig({
    apiKey: ' sfk_demo_key ',
    timeoutSeconds: 300,
    pollIntervalMs: 3000,
    maxPollAttempts: 100,
    kbPollTimeoutSeconds: 60,
  });

  assert(
    parsed.baseUrl === SNAPFILL_BASE_URL,
    'baseUrl should default to the built-in endpoint',
  );
  assert(parsed.apiKey === 'sfk_demo_key', 'apiKey should be trimmed');
  assert(parsed.timeoutSeconds === 300, 'timeoutSeconds should be kept');

  let missingApiKeyThrown = false;
  try {
    parseSnapFillConfig({});
  } catch (error) {
    missingApiKeyThrown =
      error instanceof Error &&
      error.message.includes('https://www.gosnapfill.com/home/api-key');
  }
  assert(missingApiKeyThrown, 'missing apiKey should throw the expected message');

  let missingConfigThrown = false;
  try {
    parseSnapFillConfig(undefined);
  } catch (error) {
    missingConfigThrown =
      error instanceof Error &&
      error.message.includes('plugins.entries.snapfill-claw.config.apiKey') &&
      error.message.includes('https://www.gosnapfill.com/home/api-key');
  }
  assert(missingConfigThrown, 'missing config should also guide users to the API key page');
}

function testRuntimeConfigResolution(): void {
  const pluginConfig = resolvePluginConfig({
    registerTool: () => undefined,
    pluginConfig: {
      apiKey: 'sfk_plugin_config',
      timeoutSeconds: 300,
    },
  });
  assert(
    (pluginConfig as Record<string, unknown>).apiKey === 'sfk_plugin_config',
    'resolvePluginConfig should prefer api.pluginConfig when available',
  );

  const nestedConfig = resolvePluginConfig({
    registerTool: () => undefined,
    config: {
      plugins: {
        entries: {
          'snapfill-claw': {
            config: {
              apiKey: 'sfk_nested_config',
              timeoutSeconds: 300,
            },
          },
        },
      },
    },
  });
  assert(
    (nestedConfig as Record<string, unknown>).apiKey === 'sfk_nested_config',
    'resolvePluginConfig should read nested plugin config from plain-object runtime config',
  );

  const directConfig = resolvePluginConfig({
    registerTool: () => undefined,
    config: {
      apiKey: 'sfk_direct_config',
      timeoutSeconds: 300,
    },
  });
  assert(
    (directConfig as Record<string, unknown>).apiKey === 'sfk_direct_config',
    'resolvePluginConfig should accept plain-object plugin-scoped config',
  );

  const accessorCalls: string[] = [];
  const accessorConfig = resolvePluginConfig({
    registerTool: () => undefined,
    config: {
      get: (key: string) => {
        accessorCalls.push(key);
        if (key === 'plugins.entries.snapfill-claw.config') {
          return {
            apiKey: 'sfk_accessor_config',
            timeoutSeconds: 300,
          };
        }
        return undefined;
      },
    },
  });
  assert(
    (accessorConfig as Record<string, unknown>).apiKey === 'sfk_accessor_config',
    'resolvePluginConfig should continue supporting getter-based config accessors',
  );
  assert(
    accessorCalls[0] === 'plugins.entries.snapfill-claw.config',
    'resolvePluginConfig should try the current plugin id first when using config.get',
  );
}

function createMockClient() {
  const postCalls: Array<{ path: string; body?: Record<string, unknown> }> = [];
  const getCalls: Array<{ path: string; query?: Record<string, unknown> }> = [];

  const client: SnapFillClient = {
    get: async <T>(path: string, query?: Record<string, unknown>) => {
      getCalls.push({ path, query });
      return { ok: true, data: [] as T } as ToolEnvelope<T>;
    },
    post: async <T>(path: string, body?: Record<string, unknown>) => {
      postCalls.push({ path, body });
      return {
        ok: true,
        data: { job_id: 'job_123', status: 'queued' } as T,
      } as ToolEnvelope<T>;
    },
  };

  return { client, postCalls, getCalls };
}

async function testSubmitJobValidation(): Promise<void> {
  const { client, postCalls } = createMockClient();
  const tool = createSubmitJobTool(client);

  const missingFile = await tool.execute('1', {
    mode: 'confirm_required',
    knowledge_file_ids: ['k1'],
  });
  const missingFileEnvelope = parseEnvelope(missingFile);
  assert(!missingFileEnvelope.ok, 'missing file_id should fail');
  assert(
    missingFileEnvelope.error.code === 'VALIDATION_ERROR',
    'missing file_id should return validation error',
  );
  const callCountAfterMissingFile = postCalls.length;
  assert(callCountAfterMissingFile === 0, 'invalid input should not call downstream API');

  const wrongMode = await tool.execute('2', {
    file_id: 'f_1',
    mode: 'auto_finalize',
    knowledge_file_ids: ['k1'],
  });
  const wrongModeEnvelope = parseEnvelope(wrongMode);
  assert(!wrongModeEnvelope.ok, 'invalid mode should fail');
  const callCountAfterWrongMode = postCalls.length;
  assert(callCountAfterWrongMode === 0, 'invalid mode should not call downstream API');

  const okResult = await tool.execute('3', {
    file_id: 'f_1',
    mode: 'confirm_required',
    knowledge_file_ids: ['k1', 'k2'],
    profile_id: 'p_1',
    knowledge_strategy: 'existing_only',
    timeout_seconds: 180,
  });
  const okEnvelope = parseEnvelope(okResult);
  assert(okEnvelope.ok, 'valid submit should succeed');

  assert(postCalls.length >= 1, 'valid submit should call downstream API');
  assert(postCalls.length === 1, 'valid submit should call downstream API once');
  assert(postCalls[0].path === '/jobs', 'submit job should call /jobs');

  const requestBody = postCalls[0].body as Record<string, unknown>;
  assert(
    (requestBody.source as Record<string, unknown>).type === 'file_id',
    'submit body should set source.type=file_id',
  );
  assert(
    (requestBody.knowledge as Record<string, unknown>).profile_id === 'p_1',
    'submit body should include profile_id',
  );
  assert(
    (requestBody.knowledge as Record<string, unknown>).strategy === 'existing_only',
    'submit body should include knowledge.strategy',
  );

  const temporaryResult = await tool.execute('4', {
    file_id: 'f_2',
    mode: 'confirm_required',
    knowledge_file_ids: ['k_temp_1'],
    profile_id: 'p_should_be_dropped',
    knowledge_strategy: 'temporary_only',
  });
  const temporaryEnvelope = parseEnvelope(temporaryResult);
  assert(temporaryEnvelope.ok, 'temporary-only submit should succeed');
  const temporaryCall = postCalls[1];
  assert(temporaryCall !== undefined, 'temporary submit should add a second downstream call');
  const temporaryRequestBody = temporaryCall.body as Record<string, unknown>;
  assert(
    (temporaryRequestBody.knowledge as Record<string, unknown>).strategy === 'temporary_only',
    'temporary-only submit should forward temporary_only strategy',
  );
  assert(
    (temporaryRequestBody.knowledge as Record<string, unknown>).profile_id === undefined,
    'temporary-only submit should omit profile_id',
  );
}

async function testListKnowledgeFilesQueryMapping(): Promise<void> {
  const { client, getCalls } = createMockClient();
  const tool = createListKnowledgeFilesTool(client);

  const result = await tool.execute('list-1', {
    knowledge_file_ids: ['k_temp_1', 'k_temp_2'],
    source_scope: 'temporary',
    page: 2,
    page_size: 5,
  });
  const envelope = parseEnvelope(result);
  assert(envelope.ok, 'list knowledge files should succeed');
  assert(getCalls.length === 1, 'list knowledge files should call downstream API once');
  assert(getCalls[0].path === '/knowledge-files', 'list tool should call /knowledge-files');
  assert(
    getCalls[0].query?.knowledge_file_ids === 'k_temp_1,k_temp_2',
    'knowledge_file_ids should be joined into a comma-separated query string',
  );
  assert(
    getCalls[0].query?.source_scope === 'temporary',
    'source_scope should be forwarded to the backend',
  );
}

function testValidationErrorFactory(): void {
  const err = validationError('invalid input');
  assert(!err.ok, 'validationError should return error envelope');
  assert(err.error.code === 'VALIDATION_ERROR', 'validationError code should be VALIDATION_ERROR');
}

function testPluginManifestAndSkillGuardrails(): void {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'openclaw.plugin.json'), 'utf8'),
  ) as Record<string, unknown>;
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  ) as Record<string, unknown>;

  assert(manifest.entry === './dist/index.js', 'plugin manifest should declare the built entry module');
  assert(manifest.id === 'snapfill-claw', 'plugin manifest should align plugin id with the npm package id');
  assert(packageJson.name === '@ontos-ai/snapfill-claw', 'package name should use the published npm package id');
  assert(packageJson.main === './dist/index.js', 'package main should point to the built entry module');
  assert(packageJson.types === './dist/index.d.ts', 'package types should point to emitted declarations');
  assert(
    Array.isArray(packageJson.files) && packageJson.files.includes('dist'),
    'package files should include the built dist directory',
  );
  assert(
    Array.isArray((packageJson.openclaw as Record<string, unknown> | undefined)?.extensions) &&
      ((packageJson.openclaw as Record<string, unknown>).extensions as unknown[]).includes(
        './dist/index.js',
      ),
    'package openclaw.extensions should point to the built entry module',
  );
  assert(
    (packageJson.peerDependencies as Record<string, unknown> | undefined)?.openclaw === '>=2026.3.8',
    'package should declare an OpenClaw peer dependency compatible with the current plugin runtime',
  );

  const skills = Array.isArray(manifest.skills) ? manifest.skills : [];
  assert(skills.includes('./skills/snapfill'), 'plugin manifest should bundle the snapfill skill');

  const skillContent = fs.readFileSync(
    path.join(projectRoot, 'skills', 'snapfill', 'SKILL.md'),
    'utf8',
  );
  assert(
    skillContent.includes('Do not switch to `python-docx`'),
    'skill should forbid falling back to manual python-docx editing when SnapFill is unavailable',
  );
  assert(
    !skillContent.includes('config: ["plugins.entries.snapfill.config.apiKey"]'),
    'skill should not be blocked from activating solely by missing apiKey config',
  );
  assert(
    skillContent.includes('https://www.gosnapfill.com/home/api-key'),
    'skill should direct users to the API key page when apiKey is missing',
  );
  assert(
    skillContent.includes('openclaw config set plugins.entries.snapfill-claw.config.apiKey "sfk_..."'),
    'skill should include the direct OpenClaw config command for missing apiKey',
  );
  assert(
    skillContent.includes('Do not infer failure just because progress stays at the same percentage for a long time.'),
    'skill should treat long-running in-progress jobs as still running instead of assuming failure',
  );
  assert(
    skillContent.includes('plus any supporting attachments in the same request'),
    'skill should generalize triggering beyond resume-specific supporting files',
  );
  assert(
    skillContent.includes('If the user provides supporting images and those images are meant to supply background for the form, first read the visible image content and extract the relevant text or structured facts into temporary background text.'),
    'skill should support converting image-based supporting materials into temporary text knowledge',
  );
  assert(
    skillContent.includes('Even when the image contains all needed information, do not fill the final document directly from OCR output. The OCR-derived text must still go through SnapFill and the `confirm_required` review step.'),
    'skill should require OCR-derived image content to flow through SnapFill instead of direct manual filling',
  );
  assert(
    skillContent.includes('If a SnapFill job reaches `fillchart_ready` but `field_suggestions` is empty:'),
    'skill should define explicit handling for zero-field analysis results',
  );
  assert(
    skillContent.includes('Do not claim a specific root cause such as "ordinary Word tables are unsupported"'),
    'skill should forbid over-diagnosing the cause of a zero-field result without backend evidence',
  );
  assert(
    skillContent.includes('If `field_suggestions` is empty, follow the Zero-Field Result Rule, stop, and wait for the user instead of calling `snapfill_finalize_job`.'),
    'skill should block finalize when fillchart_ready returns no fields',
  );
  assert(
    skillContent.includes('Do not proactively switch to manual workarounds such as converting to PDF, simplifying the file, using `python-docx`, or filling the document outside SnapFill while the job is still in an in-progress status.'),
    'skill should forbid proactive manual fallback while a SnapFill job is still in progress',
  );
  assert(
    skillContent.includes('If the user explicitly asks for fallback options before the job reaches a terminal state, you may describe them as optional alternatives'),
    'skill should allow discussing fallbacks when the user explicitly asks, without treating the running job as failed',
  );
  assert(
    skillContent.includes('Once the job reaches a terminal failure state such as `failed` or `timeout`'),
    'skill should allow alternatives after a real terminal failure',
  );
}

async function run(): Promise<void> {
  testErrorMapping();
  testConfigParsing();
  testRuntimeConfigResolution();
  await testSubmitJobValidation();
  await testListKnowledgeFilesQueryMapping();
  testValidationErrorFactory();
  testPluginManifestAndSkillGuardrails();

  // Keep output simple and CI-friendly.
  console.log('All tests passed.');
}

void run().catch((error) => {
  console.error(error);
  throw error;
});
