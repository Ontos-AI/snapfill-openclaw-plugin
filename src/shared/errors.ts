import type { ToolEnvelope, ToolError } from './types';

const USER_MESSAGE_BY_CODE: Record<string, string> = {
  KNOWLEDGE_SOURCE_REQUIRED:
    '未找到可用知识库。请上传资料，或允许我从历史对话中提取背景信息后重试。',
  PDF_OCR_NOT_SUPPORTED: '当前 PDF 为扫描版，无法提取文本。请上传可检索文本 PDF。',
  INSUFFICIENT_CREDITS: '账户点墨不足，请充值后重试。',
  TASK_TIMEOUT: '任务处理超时，请稍后重试。如持续失败，请提供任务 ID 联系支持。',
  FILE_NOT_FOUND: '文件不存在或已失效，请重新上传。',
  JOB_STATUS_CONFLICT: '当前任务状态不支持此操作，请等待任务进入下一阶段。',
};

const FALLBACK_USER_MESSAGE = '操作失败，请稍后重试。如问题持续，请联系支持。';

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function pickCode(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'UNKNOWN_ERROR';
  }

  const asRecord = payload as Record<string, unknown>;
  return (
    coerceString(asRecord.code) ??
    coerceString((asRecord.error as Record<string, unknown> | undefined)?.code) ??
    'UNKNOWN_ERROR'
  );
}

function pickMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const asRecord = payload as Record<string, unknown>;
  return (
    coerceString(asRecord.message) ??
    coerceString((asRecord.error as Record<string, unknown> | undefined)?.message) ??
    fallback
  );
}

function isRetryable(httpStatus: number, code: string): boolean {
  if (httpStatus >= 500 || httpStatus === 429) {
    return true;
  }
  return code === 'TASK_TIMEOUT';
}

function buildError(httpStatus: number, code: string, message: string): ToolError {
  return {
    http_status: httpStatus,
    code,
    message,
    retryable: isRetryable(httpStatus, code),
    user_message: USER_MESSAGE_BY_CODE[code] ?? FALLBACK_USER_MESSAGE,
  };
}

export function normalizeHttpError<T>(httpStatus: number, payload: unknown): ToolEnvelope<T> {
  const code = pickCode(payload);
  const message = pickMessage(payload, `HTTP ${httpStatus}`);
  return { ok: false, error: buildError(httpStatus, code, message) };
}

export function normalizeNetworkError<T>(error: unknown): ToolEnvelope<T> {
  const message = error instanceof Error ? error.message : 'Network request failed';
  return {
    ok: false,
    error: buildError(503, 'UPSTREAM_UNAVAILABLE', message),
  };
}

export function normalizeTimeoutError<T>(timeoutSeconds: number): ToolEnvelope<T> {
  return {
    ok: false,
    error: buildError(504, 'TASK_TIMEOUT', `Upstream timeout after ${timeoutSeconds}s`),
  };
}

export function validationError<T>(message: string): ToolEnvelope<T> {
  return {
    ok: false,
    error: buildError(422, 'VALIDATION_ERROR', message),
  };
}
