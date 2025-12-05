/**
 * NestJS Traceable - API Contracts
 *
 * 이 파일은 라이브러리의 공개 API 계약을 정의합니다.
 * 실제 구현이 아닌 인터페이스 명세입니다.
 */

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * 추적 컨텍스트 인터페이스
 * 요청 전체를 식별하고 span 계층 구조를 관리한다.
 */
export interface ITraceContext {
  /** 요청 전체를 식별하는 고유 ID (1-128자) */
  readonly traceId: string;

  /** 현재 작업 단위를 식별하는 ID (8자리 hex) */
  readonly spanId: string;

  /** 부모 span의 ID (8자리 hex 또는 undefined) */
  readonly parentSpanId?: string;

  /** 컨텍스트 시작 시간 (Unix timestamp ms) */
  readonly startTime: number;
}

/**
 * Span 상태
 */
export type SpanStatus = 'ok' | 'error';

/**
 * Span 인터페이스
 * 개별 작업 단위를 나타낸다.
 */
export interface ISpan {
  /** 소속된 trace의 ID */
  readonly traceId: string;

  /** 현재 span의 고유 ID */
  readonly spanId: string;

  /** 부모 span의 ID */
  readonly parentSpanId?: string;

  /** 작업명 */
  readonly operationName: string;

  /** 시작 시간 (Unix timestamp ms) */
  readonly startTime: number;

  /** 종료 시간 (Unix timestamp ms) */
  endTime?: number;

  /** 작업 상태 */
  status: SpanStatus;
}

// =============================================================================
// Generator Interfaces
// =============================================================================

/**
 * TraceId 생성기 인터페이스
 */
export interface ITraceIdGenerator {
  /**
   * 새로운 traceId를 생성한다.
   * @returns 1-128자 문자열
   */
  generate(): string;
}

/**
 * SpanId 생성기 인터페이스
 */
export interface ISpanIdGenerator {
  /**
   * 새로운 spanId를 생성한다.
   * @returns 8자리 hex 문자열
   */
  generate(): string;
}

// =============================================================================
// Adapter Interfaces
// =============================================================================

/**
 * 로거 어댑터 인터페이스
 * 다양한 로거 라이브러리와 통합하기 위한 추상화
 */
export interface ILoggerAdapter {
  /**
   * INFO 레벨 로그
   */
  log(message: string, context?: ITraceContext): void;

  /**
   * ERROR 레벨 로그
   */
  error(message: string, trace?: string, context?: ITraceContext): void;

  /**
   * WARN 레벨 로그
   */
  warn(message: string, context?: ITraceContext): void;

  /**
   * DEBUG 레벨 로그 (선택적)
   */
  debug?(message: string, context?: ITraceContext): void;

  /**
   * VERBOSE 레벨 로그 (선택적)
   */
  verbose?(message: string, context?: ITraceContext): void;
}

// =============================================================================
// Module Options
// =============================================================================

/**
 * 모듈 설정 옵션
 */
export interface TraceModuleOptions {
  /**
   * HTTP 헤더명
   * @default 'X-Trace-Id'
   */
  headerName?: string;

  /**
   * traceId 생성 함수
   * @default UUID v4 생성기
   */
  traceIdGenerator?: () => string;

  /**
   * spanId 생성 함수
   * @default 8자리 hex 생성기
   */
  spanIdGenerator?: () => string;

  /**
   * traceId 검증 함수
   * @default Lenient 검증 (비어있지 않은 128자 이하 문자열)
   */
  validateTraceId?: (id: string) => boolean;

  /**
   * 로거 어댑터
   */
  logger?: ILoggerAdapter;

  /**
   * 전역 모듈 여부
   * @default true
   */
  global?: boolean;

  /**
   * Span 최대 중첩 깊이
   * 이 값을 초과하면 새 span 생성이 무시되고 경고 로그 출력
   * @default 100
   */
  maxSpanDepth?: number;

  /**
   * 미종료 span 자동 정리 활성화
   * HTTP 요청 완료 시 미종료 span을 자동으로 'error' 상태로 종료
   * @default true
   */
  autoCleanupSpans?: boolean;

  /**
   * 미종료 span 경고 로그 출력
   * @default true
   */
  warnOnUnfinishedSpans?: boolean;
}

/**
 * 비동기 모듈 설정 옵션
 */
export interface TraceModuleAsyncOptions {
  /**
   * 의존 모듈
   */
  imports?: unknown[];

  /**
   * 팩토리 함수
   */
  useFactory: (
    ...args: unknown[]
  ) => TraceModuleOptions | Promise<TraceModuleOptions>;

  /**
   * 주입할 의존성
   */
  inject?: unknown[];
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * TraceContext 서비스 인터페이스
 * NestJS DI를 통해 주입받아 사용
 */
export interface ITraceContextService {
  /**
   * 현재 traceId를 반환한다.
   * 컨텍스트가 없으면 undefined
   */
  getTraceId(): string | undefined;

  /**
   * 현재 spanId를 반환한다.
   * 컨텍스트가 없으면 undefined
   */
  getSpanId(): string | undefined;

  /**
   * 현재 TraceContext를 반환한다.
   */
  getContext(): ITraceContext | undefined;

  /**
   * 새로운 span을 시작한다.
   * @param operationName 작업명
   * @returns 생성된 Span
   */
  startSpan(operationName: string): ISpan;

  /**
   * 현재 span을 종료한다.
   * @param status 작업 상태
   */
  endSpan(status?: SpanStatus): void;

  /**
   * 주어진 컨텍스트 내에서 함수를 실행한다.
   * @param context 설정할 컨텍스트
   * @param fn 실행할 함수
   */
  runWithContext<T>(context: ITraceContext, fn: () => T): T;
}

// =============================================================================
// Decorator Metadata
// =============================================================================

/**
 * @Trace 데코레이터 메타데이터 키
 */
export const TRACE_OPERATION_KEY = 'TRACE_OPERATION';

/**
 * @Traceable 데코레이터 메타데이터 키
 */
export const TRACEABLE_KEY = 'TRACEABLE';

// =============================================================================
// Constants
// =============================================================================

/**
 * 기본 HTTP 헤더명
 */
export const DEFAULT_HEADER_NAME = 'X-Trace-Id';

/**
 * TraceId 최대 길이
 */
export const TRACE_ID_MAX_LENGTH = 128;

/**
 * SpanId 길이
 */
export const SPAN_ID_LENGTH = 8;

/**
 * BullMQ job data에서 traceId를 저장하는 키
 */
export const BULLMQ_TRACE_KEY = '_traceId';

/**
 * gRPC metadata에서 traceId를 저장하는 키
 */
export const GRPC_TRACE_KEY = 'trace-id';

/**
 * Span 최대 중첩 깊이 기본값
 */
export const DEFAULT_MAX_SPAN_DEPTH = 100;

/**
 * 미종료 span 자동 정리 기본값
 */
export const DEFAULT_AUTO_CLEANUP_SPANS = true;

/**
 * 미종료 span 경고 로그 출력 기본값
 */
export const DEFAULT_WARN_ON_UNFINISHED_SPANS = true;
