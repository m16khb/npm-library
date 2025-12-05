/**
 * @ConcurrencyLimit() 데코레이터 옵션
 *
 * @example
 * ```typescript
 * // 간단한 사용
 * @ConcurrencyLimit(5)
 *
 * // 상세 옵션
 * @ConcurrencyLimit({ limit: 5, queueTimeout: 10000 })
 * ```
 */
export interface ConcurrencyLimitOptions {
  /**
   * 최대 동시 실행 수
   * @default 모듈 기본값 또는 10
   */
  limit?: number;

  /**
   * 대기열 타임아웃 (밀리초)
   * 이 시간 내에 슬롯을 얻지 못하면 에러 발생
   * @default undefined (무한 대기)
   */
  queueTimeout?: number;

  /**
   * 이 데코레이터에 대한 로깅 활성화
   * @default 모듈 전역 설정 따름
   */
  enableLogging?: boolean;
}

/**
 * @ConcurrencyLimit(5) 또는 @ConcurrencyLimit({ limit: 5 }) 모두 지원
 */
export type ConcurrencyLimitOptionsOrNumber = number | ConcurrencyLimitOptions;

/**
 * 특정 메서드의 동시성 상태 정보
 */
export interface MethodConcurrencyState {
  /** 현재 실행 중인 작업 수 */
  active: number;

  /** 대기 중인 작업 수 */
  pending: number;

  /** 설정된 최대 동시성 */
  limit: number;

  /** 총 처리된 작업 수 */
  processed: number;
}
