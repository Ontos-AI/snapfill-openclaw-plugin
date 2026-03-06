import { parseSnapFillConfig } from '../src/shared/client';
import { normalizeHttpError, normalizeTimeoutError, validationError } from '../src/shared/errors';
import type { SnapFillClient, ToolEnvelope, ToolExecutionResult } from '../src/shared/types';
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
}

function testConfigParsing(): void {
  const parsed = parseSnapFillConfig({
    baseUrl: ' https://api.snapfill.io/api/v1/fill-jobs ',
    apiKey: ' sfk_demo_key ',
    timeoutSeconds: 300,
    pollIntervalMs: 3000,
    maxPollAttempts: 100,
    kbPollTimeoutSeconds: 60,
  });

  assert(
    parsed.baseUrl === 'https://api.snapfill.io/api/v1/fill-jobs',
    'baseUrl should be trimmed',
  );
  assert(parsed.apiKey === 'sfk_demo_key', 'apiKey should be trimmed');
  assert(parsed.timeoutSeconds === 300, 'timeoutSeconds should be kept');

  let missingBaseUrlThrown = false;
  try {
    parseSnapFillConfig({ apiKey: 'sfk_only' });
  } catch (error) {
    missingBaseUrlThrown =
      error instanceof Error &&
      error.message.includes('plugins.entries.snapfill.config.baseUrl is required');
  }
  assert(missingBaseUrlThrown, 'missing baseUrl should throw the expected message');
}

function createMockClient() {
  const calls: Array<{ path: string; body?: Record<string, unknown> }> = [];

  const client: SnapFillClient = {
    get: async <T>() => ({ ok: true, data: {} as T }) as ToolEnvelope<T>,
    post: async <T>(path: string, body?: Record<string, unknown>) => {
      calls.push({ path, body });
      return {
        ok: true,
        data: { job_id: 'job_123', status: 'queued' } as T,
      } as ToolEnvelope<T>;
    },
  };

  return { client, calls };
}

async function testSubmitJobValidation(): Promise<void> {
  const { client, calls } = createMockClient();
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
  const callCountAfterMissingFile = calls.length;
  assert(callCountAfterMissingFile === 0, 'invalid input should not call downstream API');

  const wrongMode = await tool.execute('2', {
    file_id: 'f_1',
    mode: 'auto_finalize',
    knowledge_file_ids: ['k1'],
  });
  const wrongModeEnvelope = parseEnvelope(wrongMode);
  assert(!wrongModeEnvelope.ok, 'invalid mode should fail');
  const callCountAfterWrongMode = calls.length;
  assert(callCountAfterWrongMode === 0, 'invalid mode should not call downstream API');

  const okResult = await tool.execute('3', {
    file_id: 'f_1',
    mode: 'confirm_required',
    knowledge_file_ids: ['k1', 'k2'],
    profile_id: 'p_1',
    timeout_seconds: 180,
  });
  const okEnvelope = parseEnvelope(okResult);
  assert(okEnvelope.ok, 'valid submit should succeed');

  assert(calls.length >= 1, 'valid submit should call downstream API');
  assert(calls.length === 1, 'valid submit should call downstream API once');
  assert(calls[0].path === '/jobs', 'submit job should call /jobs');

  const requestBody = calls[0].body as Record<string, unknown>;
  assert(
    (requestBody.source as Record<string, unknown>).type === 'file_id',
    'submit body should set source.type=file_id',
  );
  assert(
    (requestBody.knowledge as Record<string, unknown>).profile_id === 'p_1',
    'submit body should include profile_id',
  );
}

function testValidationErrorFactory(): void {
  const err = validationError('invalid input');
  assert(!err.ok, 'validationError should return error envelope');
  assert(err.error.code === 'VALIDATION_ERROR', 'validationError code should be VALIDATION_ERROR');
}

async function run(): Promise<void> {
  testErrorMapping();
  testConfigParsing();
  await testSubmitJobValidation();
  testValidationErrorFactory();

  // Keep output simple and CI-friendly.
  console.log('All tests passed.');
}

void run().catch((error) => {
  console.error(error);
  throw error;
});
