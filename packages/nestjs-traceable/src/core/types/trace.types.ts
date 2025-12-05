import type { ITraceContext, ISpan } from '../interfaces';

/**
 * Span 상태
 */
export type SpanStatus = 'ok' | 'error';

/**
 * 추적 컨텍스트 타입
 */
export type TraceContext = Readonly<ITraceContext>;

/**
 * Span 타입
 */
export type Span = Readonly<ISpan>;

/**
 * 추적 옵션
 */
export interface TraceOptions {
  /** 최대 중첩 깊이 */
  maxDepth?: number;

  /** 미종료 span 자동 정리 여부 */
  autoCleanup?: boolean;

  /** 미종료 span 경고 로그 여부 */
  warnOnUnfinished?: boolean;

  /** 추적 활성화 여부 */
  enabled?: boolean;
}

/**
 * 로그 레벨
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 추적 메타데이터
 */
export interface TraceMetadata {
  /** 사용자 정의 태그 */
  tags?: Record<string, string | number | boolean>;

  /** 서비스명 */
  serviceName?: string;

  /** 서비스 버전 */
  serviceVersion?: string;

  /** 환경 */
  environment?: string;

  /** 추가 컨텍스트 */
  baggage?: Record<string, string>;
}

/**
 * 추적 통계
 */
export interface TraceStats {
  /** 총 trace 수 */
  totalTraces: number;

  /** 총 span 수 */
  totalSpans: number;

  /** 활성 span 수 */
  activeSpans: number;

  /** 평균 trace 지연시간 */
  averageTraceLatency: number;

  /** 오류율 */
  errorRate: number;
}

/**
 * 추적 내보내기 형식
 */
export interface TraceExport {
  /** trace 컨텍스트 */
  context: ITraceContext;

  /** span 목록 */
  spans: ISpan[];

  /** 내보내기 시간 */
  timestamp: number;
}

/**
 * 추적 필터
 */
export interface TraceFilter {
  /** 서비스명 필터 */
  serviceName?: string;

  /** 최소 기간 (ms) */
  minDuration?: number;

  /** 최대 기간 (ms) */
  maxDuration?: number;

  /** 상태 필터 */
  status?: SpanStatus;

  /** 태그 필터 */
  tags?: Record<string, string>;
}