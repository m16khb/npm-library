/**
 * 대기열 타임아웃 시 발생하는 에러
 *
 * @ConcurrencyLimit 데코레이터에서 queueTimeout 옵션이 설정되었을 때,
 * 지정된 시간 내에 동시성 슬롯을 확보하지 못하면 이 에러가 발생합니다.
 */
export class QueueTimeoutError extends Error {
  override readonly name = 'QueueTimeoutError' as const;
  readonly code = 'QUEUE_TIMEOUT' as const;

  constructor(
    /**
     * 타임아웃이 발생한 메서드 이름
     */
    public readonly methodName: string,
    /**
     * 설정된 대기열 타임아웃 (밀리초)
     */
    public readonly queueTimeout: number,
  ) {
    super(`Queue timeout after ${queueTimeout}ms for ${methodName}`);
    // Node.js 전용: 스택 트레이스에서 이 클래스 생성자를 제외
    const ErrorWithCapture = Error as typeof Error & {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      captureStackTrace?: (target: object, constructor: Function) => void;
    };
    ErrorWithCapture.captureStackTrace?.(this, QueueTimeoutError);
  }

  /**
   * 에러가 QueueTimeoutError인지 확인
   */
  static isQueueTimeoutError(error: unknown): error is QueueTimeoutError {
    return (
      error instanceof QueueTimeoutError ||
      (error instanceof Error && error.name === 'QueueTimeoutError')
    );
  }
}
