/**
 * @Timeout() 데코레이터 옵션
 *
 * @example
 * ```typescript
 * // 간단한 사용
 * @Timeout(5000)
 *
 * // 상세 옵션
 * @Timeout({ milliseconds: 5000, message: 'API call timed out' })
 * ```
 */
export interface TimeoutOptions {
  /**
   * 타임아웃 시간 (밀리초)
   * @default 모듈 기본값 또는 30000
   */
  milliseconds?: number;

  /**
   * 타임아웃 시 에러 메시지
   * @default "Operation timed out"
   */
  message?: string;

  /**
   * 이 데코레이터에 대한 로깅 활성화
   * @default 모듈 전역 설정 따름
   */
  enableLogging?: boolean;

  /**
   * 타임아웃 발생 시 호출되는 콜백
   */
  onTimeout?: (methodName: string, timeout: number) => void;
}

/**
 * @Timeout(5000) 또는 @Timeout({ milliseconds: 5000 }) 모두 지원
 */
export type TimeoutOptionsOrMilliseconds = number | TimeoutOptions;
