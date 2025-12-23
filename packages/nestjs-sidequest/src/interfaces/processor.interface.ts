/**
 * @Processor 데코레이터 옵션
 */
export interface ProcessorOptions {
  /**
   * 동시 처리 작업 수 (큐 설정 오버라이드)
   */
  concurrency?: number;
}

/**
 * 프로세서 메타데이터
 */
export interface ProcessorMetadata {
  /** 큐 이름 */
  queueName: string;

  /** 프로세서 옵션 */
  options?: ProcessorOptions;
}

/**
 * @OnJob 데코레이터 옵션
 */
export interface OnJobOptions {
  /**
   * Job 우선순위 (높을수록 먼저 처리)
   */
  priority?: number;

  /**
   * 최대 실행 시간 (ms)
   */
  timeout?: number;
}

/**
 * OnJob 핸들러 메타데이터
 */
export interface OnJobMetadata {
  /** Job 이름 */
  jobName: string;

  /** Job 옵션 */
  options?: OnJobOptions;
}

/**
 * 등록된 핸들러 정보
 */
export interface RegisteredHandler {
  /** 메서드 이름 */
  methodName: string;

  /** Job 이름 */
  jobName: string;

  /** Job 옵션 */
  options?: OnJobOptions;

  /** 재시도 옵션 */
  retryOptions?: RetryOptions;
}

/**
 * 재시도 옵션
 */
export interface RetryOptions {
  /**
   * 최대 시도 횟수 (기본값: 3)
   */
  maxAttempts?: number;

  /**
   * 재시도 지연 시간 (ms, 기본값: 1000)
   */
  delay?: number;

  /**
   * 백오프 전략 (기본값: 'exponential')
   */
  backoff?: 'fixed' | 'exponential';
}

/**
 * 등록된 프로세서 정보
 */
export interface RegisteredProcessor {
  /** 큐 이름 */
  queueName: string;

  /** 프로세서 인스턴스 */
  instance: unknown;

  /** 프로세서 클래스 */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  metatype: Function;

  /** 등록된 핸들러 맵 (jobName -> handler) */
  handlers: Map<string, RegisteredHandler>;

  /** 완료 이벤트 핸들러 맵 (jobName -> methodName) */
  completeHandlers: Map<string, string>;

  /** 실패 이벤트 핸들러 맵 (jobName -> methodName) */
  failedHandlers: Map<string, string>;
}
