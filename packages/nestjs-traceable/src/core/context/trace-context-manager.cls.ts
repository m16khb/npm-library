import type {
  ITraceContext,
  ITraceContextManager,
  ITraceIdGenerator,
  ISpanIdGenerator,
} from '../interfaces';
import { DefaultTraceIdGenerator } from '../generators/trace-id.generator';
import { DefaultSpanIdGenerator } from '../generators/span-id.generator';
import type { IClsAdapter } from '../../adapters/cls.adapter';

/**
 * CLS 어댑터를 사용하는 추적 컨텍스트 관리자
 * AsyncLocalStorage 또는 nestjs-cls를 통해 추적 컨텍스트를 관리한다.
 */
export class ClsTraceContextManager implements ITraceContextManager {
  private readonly traceIdGenerator: ITraceIdGenerator;
  private readonly spanIdGenerator: ISpanIdGenerator;

  constructor(
    private readonly clsAdapter: IClsAdapter,
    traceIdGenerator?: ITraceIdGenerator,
    spanIdGenerator?: ISpanIdGenerator,
  ) {
    this.traceIdGenerator = traceIdGenerator ?? new DefaultTraceIdGenerator();
    this.spanIdGenerator = spanIdGenerator ?? new DefaultSpanIdGenerator();
  }

  /**
   * 현재 컨텍스트를 가져온다.
   */
  getCurrent(): ITraceContext | undefined {
    return this.clsAdapter.getCurrent();
  }

  /**
   * 새로운 컨텍스트를 생성한다.
   */
  create(traceId: string, spanId?: string, parentSpanId?: string): ITraceContext {
    // traceId 유효성 검증
    if (!this.traceIdGenerator.validate(traceId)) {
      throw new Error(`Invalid traceId: ${traceId}`);
    }

    // spanId가 제공되지 않으면 생성
    const finalSpanId = spanId ?? this.spanIdGenerator.generate();

    // spanId 유효성 검증
    if (!this.spanIdGenerator.validate(finalSpanId)) {
      throw new Error(`Invalid spanId: ${finalSpanId}`);
    }

    const context: ITraceContext = {
      traceId,
      spanId: finalSpanId,
      parentSpanId,
      startTime: Date.now(),
    };

    return context;
  }

  /**
   * 컨텍스트를 설정하고 함수를 실행한다.
   */
  run<T>(context: ITraceContext, fn: () => T): T {
    return this.clsAdapter.run(context, fn);
  }

  /**
   * 컨텍스트를 설정하고 비동기 함수를 실행한다.
   */
  runAsync<T>(context: ITraceContext, fn: () => Promise<T>): Promise<T> {
    return this.clsAdapter.runAsync(context, fn);
  }

  /**
   * 새로운 자식 컨텍스트를 생성한다.
   */
  createChild(customSpanId?: string): ITraceContext | undefined {
    const current = this.getCurrent();
    if (!current) {
      return undefined;
    }

    const spanId = customSpanId ?? this.spanIdGenerator.generate();

    return this.create(
      current.traceId,
      spanId,
      current.spanId,
    );
  }

  /**
   * 현재 컨텍스트가 있는지 확인한다.
   */
  hasContext(): boolean {
    return this.clsAdapter.hasContext();
  }

  /**
   * 현재 spanId를 가져온다.
   */
  getCurrentSpanId(): string | undefined {
    return this.getCurrent()?.spanId;
  }

  /**
   * 현재 traceId를 가져온다.
   */
  getCurrentTraceId(): string | undefined {
    return this.getCurrent()?.traceId;
  }

  /**
   * 주어진 traceId가 현재 traceId와 일치하는지 확인한다.
   */
  isSameTrace(traceId: string): boolean {
    const current = this.getCurrent();
    return current?.traceId === traceId;
  }
}