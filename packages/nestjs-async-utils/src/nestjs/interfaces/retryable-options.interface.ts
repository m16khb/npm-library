import type {RetryStrategy, RetryFilter} from '../../core/retry/types.js';

/**
 * @Retryable() 데코레이터 옵션
 *
 * @example
 * ```typescript
 * @Retryable({
 *   retries: 3,
 *   strategy: exponentialBackoff(100, 5000),
 *   retryWhen: (error) => error.name !== 'ValidationError',
 * })
 * async fetchData() { ... }
 * ```
 */
export interface RetryableOptions {
  /**
   * 최대 재시도 횟수 (초기 시도 제외)
   * @default 모듈 기본값 또는 3
   */
  retries?: number;

  /**
   * 재시도 지연 전략
   * Core의 exponentialBackoff, linearBackoff 등 사용 가능
   * @default exponentialBackoff(100, 10000, 2)
   */
  strategy?: RetryStrategy;

  /**
   * 재시도 조건 함수
   * true 반환 시 재시도, false 반환 시 즉시 실패
   * @default defaultRetryFilter (네트워크/일시적 에러만 재시도)
   */
  retryWhen?: RetryFilter;

  /**
   * 특정 에러 클래스들만 재시도
   * retryWhen보다 간단한 대안
   */
  retryOn?: Array<new (...args: any[]) => Error>;

  /**
   * 이 데코레이터에 대한 로깅 활성화
   * @default 모듈 전역 설정 따름
   */
  enableLogging?: boolean;

  /**
   * 재시도 시 호출되는 콜백
   */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}
