import type { ModuleMetadata } from '@nestjs/common';
import type { ITraceIdGenerator, ISpanIdGenerator, ILoggerAdapter } from '../../core/interfaces';

/**
 * CLS 사용 옵션
 */
export type ClsImplementation = 'async-local-storage' | 'nestjs-cls';

/**
 * TraceModule 옵션
 */
export interface TraceModuleOptions {
  /** HTTP 헤더명 (기본값: 'X-Trace-Id') */
  headerName?: string;

  /** CLS 구현 방식 선택 (기본값: 'async-local-storage') */
  clsImplementation?: ClsImplementation;

  /** CLS 설정 (nestjs-cls 사용 시) */
  clsOptions?: {
    /** CLS 미들웨어 설정 */
    middleware?: {
      /** 미들웨어 자동 등록 여부 */
      mount?: boolean;
      /** 요청에서 추출할 헤더 목록 */
      extractFromHeaders?: string[];
    };
    /** 사용자 정의 ID 생성기 */
    idGenerator?: () => string;
  };

  /** TraceId 생성기 (기본값: UUID v4) */
  traceIdGenerator?: ITraceIdGenerator;

  /** SpanId 생성기 (기본값: 8자리 hex) */
  spanIdGenerator?: ISpanIdGenerator;

  /** TraceId 검증 함수 (기본값: 길이만 체크) */
  validateTraceId?: (id: string) => boolean;

  /** 로거 어댑터 */
  logger?: ILoggerAdapter;

  /** 전역 모듈 여부 (기본값: true) */
  global?: boolean;

  /** Span 최대 중첩 깊이 (기본값: 100) */
  maxSpanDepth?: number;

  /** 미종료 span 자동 정리 (기본값: true) */
  autoCleanupSpans?: boolean;

  /** 미종료 span 경고 로그 (기본값: true) */
  warnOnUnfinishedSpans?: boolean;

  /** 추적 활성화 여부 (기본값: true) */
  enabled?: boolean;

  /** 서비스명 */
  serviceName?: string;

  /** 서비스 버전 */
  serviceVersion?: string;

  /** 환경 */
  environment?: string;
}

/**
 * TraceModule 비동기 옵션
 */
export interface TraceModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /** 팩토리 함수 */
  useFactory: (...args: any[]) => Promise<TraceModuleOptions> | TraceModuleOptions;

  /** 주입할 프로바이더 */
  inject?: any[];
}

/**
 * TraceModule 팩토리 옵션
 */
export interface TraceModuleFactoryOptions {
  /** 옵션 팩토리 함수 */
  optionsFactory: () => TraceModuleOptions;
}