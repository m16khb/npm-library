/**
 * 재시도 필터 인터페이스
 */
export interface RetryFilter {
  /**
   * 에러를 재시도할지 여부를 결정
   * @param error 발생한 에러
   * @param attempt 현재 재시도 횟수 (1부터 시작, 선택적)
   * @returns true면 재시도, false면 즉시 실패
   */
  (error: Error, attempt?: number): boolean;
}

/**
 * 재시도 전략 인터페이스
 */
export interface RetryStrategy {
  /**
   * 다음 재시도까지의 지연 시간을 계산
   * @param attempt 현재 재시도 횟수 (1부터 시작)
   * @param error 발생한 에러 (선택적)
   * @returns 다음 재시도까지의 지연 시간 (밀리초)
   */
  (attempt: number, error?: Error): number;
}

/**
 * 재시도 옵션
 */
export interface RetryOptions {
  /**
   * 최대 재시도 횟수 (기본값: 3)
   */
  attempts?: number;

  /**
   * 재시도 전략 (기본값: 지수 백오프)
   */
  strategy?: RetryStrategy;

  /**
   * 재시도 여부를 결정하는 필터 함수
   * @param error 발생한 에러
   * @returns true면 재시도, false면 즉시 실패
   */
  retryIf?: (error: Error) => boolean;

  /**
   * 취소 신호
   */
  signal?: AbortSignal;

  /**
   * 재시도 시 호출되는 콜백
   * @param attempt 현재 재시도 횟수
   * @param error 발생한 에러
   * @param delay 다음 재시도까지의 지연 시간
   */
  onRetry?: (attempt: number, error: Error, delay: number) => void;

  /**
   * 성공 시 호출되는 콜백 (옵저버빌리티)
   * @param attempt 시도 횟수
   * @param result 결과값
   */
  onSuccess?: (attempt: number, result: any) => void;

  /**
   * 최종 실패 시 호출되는 콜백 (옵저버빌리티)
   * @param attempts 총 시도 횟수
   * @param lastError 마지막 에러
   * @param errors 모든 에러 목록
   */
  onError?: (attempts: number, lastError: Error, errors: Error[]) => void;
}

/**
 * 재시도 상태
 */
export interface RetryState {
  /**
   * 현재 시도 횟수
   */
  attempt: number;

  /**
   * 남은 재시도 횟수
   */
  remaining: number;

  /**
   * 다음 재시도까지의 지연 시간
   */
  delay: number;

  /**
   * 발생한 에러 목록
   */
  errors: Error[];
}
