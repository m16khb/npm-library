import type { InjectionToken, ModuleMetadata, OptionalFactoryDependency } from '@nestjs/common';

/**
 * TraceModule 옵션
 */
export interface TraceModuleOptions {
  /** HTTP 헤더명 (기본값: 'X-Trace-Id') */
  headerName?: string;

  /** 전역 모듈 여부 (기본값: true) */
  global?: boolean;

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
  useFactory: (...args: unknown[]) => Promise<TraceModuleOptions> | TraceModuleOptions;

  /** 주입할 프로바이더 */
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}

/**
 * TraceModule 팩토리 옵션
 */
export interface TraceModuleFactoryOptions {
  /** 옵션 팩토리 함수 */
  optionsFactory: () => TraceModuleOptions;
}
