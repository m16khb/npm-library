/**
 * 타임아웃 옵션
 */
export interface TimeoutOptions {
  /**
   * 타임아웃 시간 (밀리초)
   */
  milliseconds: number;

  /**
   * 타임아웃 시 반환할 기본값
   */
  fallback?: any;

  /**
   * 취소 신호
   */
  signal?: AbortSignal;

  /**
   * 타임아웃 시 호출되는 콜백
   * @param reason 타임아웃 이유
   */
  onTimeout?: (reason: string) => void;

  /**
   * 타임아웃 시 실행할 정리 함수
   */
  cleanup?: () => void | Promise<void>;

  /**
   * 성공 시 호출되는 콜백 (옵저버빌리티)
   * @param result 결과값
   * @param duration 실행 시간
   */
  onSuccess?: (result: any, duration: number) => void;

  /**
   * 실패 시 호출되는 콜백 (옵저버빌리티)
   * @param error 에러
   * @param duration 실행 시간
   */
  onError?: (error: Error, duration: number) => void;
}
