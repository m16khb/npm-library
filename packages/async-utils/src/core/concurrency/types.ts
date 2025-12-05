// import { AbortError } from '../errors/abort-error'; // Commented out as it's only used in JSDoc

/**
 * 동시성 제한 함수 타입
 */
export interface LimitFunction {
  /**
   * 작업을 큐에 추가하고 실행
   * @param fn 실행할 비동기 함수
   * @param options 작업 옵션
   * @returns Promise<T>
   */
  <T>(fn: () => Promise<T>, options?: LimitTaskOptions): Promise<T>;

  /**
   * 현재 실행 중인 작업 수
   */
  readonly activeCount: number;

  /**
   * 대기 중인 작업 수
   */
  readonly pendingCount: number;

  /**
   * 최대 동시성을 동적으로 설정
   * @param concurrency 새로운 동시성 제한
   */
  setConcurrency(concurrency: number): void;

  /**
   * 대기 중인 모든 작업을 취소하고 큐를 비움
   */
  clearQueue(): void;

  /**
   * 상태 정보 가져오기
   */
  getState(): ConcurrencyState;
}

/**
 * 작업 옵션
 */
export interface LimitTaskOptions {
  /**
   * 작업 우선순위 (0-10, 높을수록 높은 우선순위, 기본값: 5)
   */
  priority?: number;

  /**
   * 취소 신호
   */
  signal?: AbortSignal | undefined;

  /**
   * 작업 식별자
   */
  id?: string;
}

/**
 * 내부 큐 아이템
 */
export interface QueueItem<T = any> {
  /**
   * 실행할 함수
   */
  fn: () => Promise<T>;

  /**
   * resolve 함수
   */
  resolve: (value: T) => void;

  /**
   * reject 함수
   */
  reject: (error: Error) => void;

  /**
   * 작업 옵션
   */
  options: Omit<Required<LimitTaskOptions>, 'signal'> & {
    signal?: AbortSignal;
  };

  /**
   * 큐에 추가된 시간
   */
  timestamp: number;

  /**
   * 작업 ID (자동 생성)
   */
  id: string;
}

/**
 * 동시성 제한 상태
 */
export interface ConcurrencyState {
  /**
   * 현재 동시성 제한
   */
  concurrency: number;

  /**
   * 실행 중인 작업 수
   */
  active: number;

  /**
   * 대기 중인 작업 수
   */
  pending: number;

  /**
   * 총 처리된 작업 수
   */
  processed: number;

  /**
   * 큐에 있는 작업 목록 (ID 기준)
   */
  queue: string[];
}
