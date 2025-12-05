/**
 * 모든 재시도 실패 시 발생하는 에러
 */
export class RetryError extends Error {
  override readonly name = 'RetryError';
  readonly code = 'RETRY_EXHAUSTED' as const;

  constructor(
    message: string = 'Maximum retry attempts exceeded',
    /** 총 시도 횟수 */
    public readonly attempts: number = 0,
    /** 마지막 에러 */
    public readonly lastError?: Error,
    /** 모든 에러 배열 */
    public readonly errors: Error[] = [],
    options?: ErrorOptions,
  ) {
    super(message, {
      cause: lastError,
      ...options,
    });

    // V8 엔진에서 proper stack trace를 위해
    if ((globalThis as any).Error?.captureStackTrace) {
      (globalThis as any).Error.captureStackTrace(this, RetryError);
    }
  }

  /**
   * 주어진 에러가 RetryError인지 확인합니다
   */
  static isRetryError(error: unknown): error is RetryError {
    return error instanceof RetryError;
  }

  /**
   * 모든 에러 배열을 반환합니다
   */
  getAllErrors(): Error[] {
    return [...this.errors];
  }

  /**
   * 마지막 에러를 반환합니다
   */
  getLastError(): Error | undefined {
    return this.lastError;
  }

  /**
   * 시도 횟수를 반환합니다
   */
  getAttemptCount(): number {
    return this.attempts;
  }
}
