/**
 * wait 함수 옵션
 */
export interface WaitOptions {
  /**
   * 취소 신호
   */
  signal?: AbortSignal;

  /**
   * 대기 완료 시 반환할 값
   */
  value?: unknown;

  /**
   * 타이머 참조를 unref할지 여부 (Node.js 전용)
   * true로 설정하면 이 타이머가 프로세스 종료를 막지 않음
   * @default false
   */
  unref?: boolean;
}

/**
 * wait 함수 반환 타입 (값이 있는 경우)
 */
export interface WaitResult<T> {
  /**
   * 대기 시간 (밀리초)
   */
  elapsed: number;

  /**
   * 반환 값
   */
  value: T;
}
