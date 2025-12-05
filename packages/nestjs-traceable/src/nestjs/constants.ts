/**
 * TraceModule 상수
 */

// HTTP 헤더
export const DEFAULT_TRACE_HEADER = 'X-Trace-Id';
export const DEFAULT_SPAN_HEADER = 'X-Span-Id';
export const DEFAULT_PARENT_SPAN_HEADER = 'X-Parent-Span-Id';

// 메타데이터 키
export const TRACE_METADATA_KEY = 'trace:operation';
export const TRACEABLE_METADATA_KEY = 'traceable:enabled';
export const SPAN_METADATA_KEY = 'span:operation';

// DI 토큰
export const TRACE_OPTIONS = 'TRACE_OPTIONS';
export const TRACE_CONTEXT_MANAGER = 'TRACE_CONTEXT_MANAGER';
export const SPAN_MANAGER = 'SPAN_MANAGER';
export const LOGGER_ADAPTER = 'LOGGER_ADAPTER';

// 기본값
export const DEFAULT_MAX_SPAN_DEPTH = 100;
export const DEFAULT_TRACE_ENABLED = true;
export const DEFAULT_AUTO_CLEANUP = true;
export const DEFAULT_WARN_UNFINISHED = true;

// 로그 메시지
export const LOG_MESSAGES = {
  SPAN_STARTED: 'Span started',
  SPAN_ENDED: 'Span ended',
  SPAN_ERROR: 'Span error',
  UNFINISHED_SPANS: 'Unfinished spans detected',
  MAX_DEPTH_EXCEEDED: 'Maximum span depth exceeded',
  TRACE_CONTEXT_MISSING: 'Trace context missing',
  INVALID_TRACE_ID: 'Invalid trace ID',
} as const;