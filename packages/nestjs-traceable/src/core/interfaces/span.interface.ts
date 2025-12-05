/**
 * Span 상태
 */
export type SpanStatus = 'ok' | 'error';

/**
 * Span 인터페이스
 * 개별 작업 단위를 나타낸다.
 */
export interface ISpan {
  /** 소속된 trace의 ID */
  readonly traceId: string;

  /** 현재 span의 고유 ID */
  readonly spanId: string;

  /** 부모 span의 ID */
  readonly parentSpanId?: string;

  /** 작업명 */
  readonly operationName: string;

  /** 시작 시간 (Unix timestamp ms) */
  readonly startTime: number;

  /** 종료 시간 (Unix timestamp ms) */
  endTime?: number;

  /** 작업 상태 */
  status: SpanStatus;

  /** 태그 */
  tags?: Record<string, string | number | boolean>;

  /** 로그 */
  logs?: Array<{
    timestamp: number;
    level: string;
    message: string;
  }>;
}

/**
 * Span 관리자 인터페이스
 */
export interface ISpanManager {
  /**
   * 새로운 span을 시작한다
   */
  startSpan(operationName: string, parentContext?: ITraceContext): ISpan;

  /**
   * span을 종료한다
   */
  endSpan(span: ISpan, status?: SpanStatus, error?: Error): void;

  /**
   * 현재 활성화된 span 스택을 가져온다
   */
  getActiveSpans(): ISpan[];

  /**
   * 현재 span을 가져온다
   */
  getCurrentSpan(): ISpan | undefined;
}