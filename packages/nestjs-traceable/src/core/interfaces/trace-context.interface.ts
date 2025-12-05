/**
 * 추적 컨텍스트 인터페이스
 * 요청 전체를 식별하고 span 계층 구조를 관리한다.
 */
export interface ITraceContext {
  /** 요청 전체를 식별하는 고유 ID (1-128자) */
  readonly traceId: string;

  /** 현재 작업 단위를 식별하는 ID (8자리 hex) */
  readonly spanId: string;

  /** 부모 span의 ID (8자리 hex 또는 undefined) */
  readonly parentSpanId?: string;

  /** 컨텍스트 시작 시간 (Unix timestamp ms) */
  readonly startTime: number;
}

/**
 * 추적 컨텍스트 관리자 인터페이스
 * AsyncLocalStorage를 통해 컨텍스트를 관리한다.
 */
export interface ITraceContextManager {
  /**
   * 현재 컨텍스트를 가져온다
   */
  getCurrent(): ITraceContext | undefined;

  /**
   * 새로운 컨텍스트를 생성하고 설정한다
   */
  create(traceId: string, spanId?: string, parentSpanId?: string): ITraceContext;

  /**
   * 컨텍스트를 설정한다
   */
  run<T>(context: ITraceContext, fn: () => T): T;

  /**
   * 비동기 컨텍스트를 실행한다
   */
  runAsync<T>(context: ITraceContext, fn: () => Promise<T>): Promise<T>;

  /**
   * 새로운 자식 컨텍스트를 생성한다 (parentSpanId 설정)
   */
  createChild(operationName?: string): ITraceContext | undefined;
}