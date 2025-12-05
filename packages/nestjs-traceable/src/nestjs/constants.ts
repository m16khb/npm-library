/**
 * TraceModule 상수
 */

// HTTP 헤더
export const DEFAULT_TRACE_HEADER = 'X-Trace-Id';

// 메타데이터 키
export const TRACE_METADATA_KEY = 'trace:operation';
export const TRACEABLE_METADATA_KEY = 'traceable:enabled';

// DI 토큰
export const TRACE_OPTIONS = 'TRACE_OPTIONS';
export const TRACE_CONTEXT_MANAGER = 'TRACE_CONTEXT_MANAGER';

// 기본값
export const DEFAULT_TRACE_ENABLED = true;
export const TRACE_ID_MAX_LENGTH = 128;

// 로그 메시지
export const LOG_MESSAGES = {
  TRACE_CONTEXT_MISSING: 'Trace context missing',
  INVALID_TRACE_ID: 'Invalid trace ID',
} as const;
