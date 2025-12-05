/**
 * NestJS Async Utils - 라이브러리 기본값
 *
 * 모듈 설정 없이 데코레이터만 사용해도 동작하도록 하는 기본값
 */

/**
 * 라이브러리 기본값
 */
export const LIBRARY_DEFAULTS = {
  /** 기본 재시도 횟수 */
  retries: 3,
  /** 기본 타임아웃 (30초) */
  timeout: 30000,
  /** 기본 동시성 제한 */
  concurrency: 10,
  /** 기본 로깅 비활성화 */
  enableLogging: false,
} as const;

/**
 * 라이브러리 기본값 타입
 */
export type LibraryDefaults = typeof LIBRARY_DEFAULTS;
