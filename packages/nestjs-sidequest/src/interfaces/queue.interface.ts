/**
 * Bulk Job 추가 옵션
 */
export interface BulkJobOptions {
  /**
   * 청크 크기 (한 번에 처리할 Job 수)
   * @default 100
   */
  chunkSize?: number;
}

/**
 * Queue 서비스 인터페이스
 * @InjectQueue()로 주입되는 객체의 타입
 */
export interface IQueueService {
  /** 큐 이름 */
  readonly name: string;

  /**
   * Job 추가
   *
   * @param JobClass - Job 클래스
   * @param args - Job 실행 인자
   * @returns Job ID
   *
   * @example
   * ```typescript
   * await this.emailQueue.add(SendEmailJob, 'user@example.com', 'Welcome!');
   * ```
   */
  add<T>(JobClass: new (...args: unknown[]) => T, ...args: unknown[]): Promise<string>;

  /**
   * Job 추가 (옵션 포함)
   *
   * @param JobClass - Job 클래스
   * @param options - Job 옵션
   * @param args - Job 실행 인자
   * @returns Job ID
   *
   * @example
   * ```typescript
   * await this.emailQueue.addWithOptions(
   *   SendEmailJob,
   *   { priority: 10, timeout: 5000 },
   *   'user@example.com',
   *   'Welcome!'
   * );
   * ```
   */
  addWithOptions<T>(
    JobClass: new (...args: unknown[]) => T,
    options: JobAddOptions,
    ...args: unknown[]
  ): Promise<string>;

  /**
   * 예약된 Job 추가
   *
   * @param JobClass - Job 클래스
   * @param scheduledAt - 실행 예정 시간
   * @param args - Job 실행 인자
   * @returns Job ID
   *
   * @example
   * ```typescript
   * const tomorrow = new Date();
   * tomorrow.setDate(tomorrow.getDate() + 1);
   * await this.emailQueue.addScheduled(SendEmailJob, tomorrow, 'user@example.com');
   * ```
   */
  addScheduled<T>(
    JobClass: new (...args: unknown[]) => T,
    scheduledAt: Date,
    ...args: unknown[]
  ): Promise<string>;

  /**
   * Bulk Job 추가
   *
   * @param jobs - Job 목록
   * @param options - Bulk 옵션 (chunkSize 등)
   * @returns Job ID 배열
   *
   * @example
   * ```typescript
   * // 기본 청크 크기(100) 사용
   * await queue.addBulk([
   *   { JobClass: SendEmailJob, args: ['user1@example.com'] },
   *   { JobClass: SendEmailJob, args: ['user2@example.com'] },
   * ]);
   *
   * // 청크 크기 지정
   * await queue.addBulk(jobs, { chunkSize: 50 });
   * ```
   */
  addBulk<T>(
    jobs: Array<{
      JobClass: new (...args: unknown[]) => T;
      args: unknown[];
      options?: JobAddOptions;
    }>,
    options?: BulkJobOptions,
  ): Promise<string[]>;
}

/**
 * Job 추가 옵션
 */
export interface JobAddOptions {
  /**
   * 우선순위 (높을수록 먼저 처리)
   *
   * @deprecated Sidequest.js는 현재 개별 Job 레벨 priority를 지원하지 않습니다.
   * 큐 레벨 priority를 대신 사용하세요 (SidequestModule.forRoot의 queues 옵션 참조).
   * 이 옵션은 현재 무시됩니다.
   */
  priority?: number;

  /**
   * 최대 실행 시간 (ms)
   */
  timeout?: number;

  /**
   * 최대 시도 횟수
   */
  maxAttempts?: number;

  /**
   * 재시도 간격 (ms, 기본값: 1000)
   */
  retryDelay?: number;

  /**
   * 백오프 전략
   */
  backoffStrategy?: 'fixed' | 'exponential';

  /**
   * 중복 Job 방지
   *
   * true로 설정하면 동일한 Job이 큐에 중복으로 추가되지 않습니다.
   * Sidequest.js의 unique() 메서드를 사용합니다.
   */
  unique?: boolean;

  /**
   * 예약 실행 시간
   */
  scheduledAt?: Date;
}

/**
 * 에러 데이터
 */
export interface ErrorData {
  /** 에러 이름 */
  name?: string | null;

  /** 에러 메시지 */
  message?: string | null;

  /** 스택 트레이스 */
  stack?: string | null;

  /** 추가 데이터 */
  [key: string]: unknown;
}

/**
 * Job 정보
 */
export interface JobInfo {
  /** Job ID */
  id: string;

  /** 큐 이름 */
  queue: string;

  /** Job 이름 */
  name?: string;

  /** 현재 상태 */
  state: JobState;

  /** 시도 횟수 */
  attempt: number;

  /** 최대 시도 횟수 */
  maxAttempts: number;

  /** 실행 인자 */
  args?: unknown[];

  /** 실행 결과 */
  result?: unknown;

  /** 발생한 에러 목록 */
  errors?: ErrorData[] | null;

  /** 생성 시간 */
  insertedAt: Date;

  /** 시도 시간 */
  attemptedAt?: Date;

  /** 완료 시간 */
  completedAt?: Date;
}

/**
 * Job 상태
 */
export type JobState =
  | 'available'
  | 'scheduled'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'discarded'
  | 'cancelled';
