/**
 * 사용자 취소 시 발생하는 에러
 */
export class AbortError extends Error {
  override readonly name = 'AbortError';
  readonly code = 'ABORT_ERR' as const;

  constructor(message: string = 'Operation was aborted', cause?: Error, options?: ErrorOptions) {
    super(message, {
      cause,
      ...options,
    });

    // V8 엔진에서 proper stack trace를 위해
    if ((globalThis as any).Error?.captureStackTrace) {
      (globalThis as any).Error.captureStackTrace(this, AbortError);
    }
  }

  /**
   * 주어진 에러가 AbortError인지 확인합니다
   */
  static isAbortError(error: unknown): error is AbortError {
    return error instanceof AbortError;
  }

  /**
   * 에러 체인에서 AbortError가 있는지 확인합니다
   */
  static hasAbortError(error: unknown): boolean {
    let current: unknown = error;

    while (current) {
      if (current instanceof AbortError) {
        return true;
      }

      if (current instanceof Error && current.cause) {
        current = current.cause;
      } else {
        break;
      }
    }

    return false;
  }
}
