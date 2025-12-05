/**
 * 타임아웃 발생 시 발생하는 에러
 */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError';
  readonly code = 'TIMEOUT' as const;

  constructor(
    message: string = 'Operation timed out',
    /** 타임아웃 시간 (밀리초) */
    public readonly timeout: number = 0,
    cause?: Error,
    options?: ErrorOptions,
  ) {
    super(message, {
      cause,
      ...options,
    });

    // V8 엔진에서 proper stack trace를 위해
    if ((globalThis as any).Error?.captureStackTrace) {
      (globalThis as any).Error.captureStackTrace(this, TimeoutError);
    }
  }

  /**
   * 주어진 에러가 TimeoutError인지 확인합니다
   */
  static isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError;
  }

  /**
   * 타임아웃 시간을 밀리초로 반환합니다
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * 타임아웃 시간을 초로 반환합니다
   */
  getTimeoutSeconds(): number {
    return this.timeout / 1000;
  }
}
