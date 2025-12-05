import { Injectable, Logger } from '@nestjs/common';
import type {
  ITraceContext,
  ITraceContextManager,
  ILoggerAdapter,
} from '../../core/interfaces';

/**
 * 추적 컨텍스트 서비스
 * NestJS 애플리케이션에서 추적 컨텍스트를 관리한다.
 */
@Injectable()
export class TraceContextService {
  private readonly logger: Logger;

  constructor(
    private readonly contextManager: ITraceContextManager,
    logger?: ILoggerAdapter,
  ) {
    // NestJS Logger를 기본으로 사용
    this.logger = (logger as any) ?? new Logger(TraceContextService.name);
  }

  /**
   * 현재 trace ID를 가져온다.
   */
  getTraceId(): string | undefined {
    try {
      return this.contextManager.getCurrentTraceId();
    } catch (error) {
      this.error('Error getting trace ID', error as Error);
      return undefined;
    }
  }

  /**
   * 현재 span ID를 가져온다.
   */
  getSpanId(): string | undefined {
    try {
      return this.contextManager.getCurrentSpanId();
    } catch (error) {
      this.error('Error getting span ID', error as Error);
      return undefined;
    }
  }

  /**
   * 현재 추적 컨텍스트를 가져온다.
   */
  getContext(): ITraceContext | undefined {
    try {
      return this.contextManager.getCurrent();
    } catch (error) {
      this.error('Error getting trace context', error as Error);
      return undefined;
    }
  }

  /**
   * 추적 컨텍스트가 있는지 확인한다.
   */
  hasContext(): boolean {
    try {
      return this.contextManager.hasContext();
    } catch (error) {
      this.error('Error checking context', error as Error);
      return false;
    }
  }

  /**
   * 새로운 자식 컨텍스트를 생성한다.
   */
  createChild(customSpanId?: string): ITraceContext | undefined {
    try {
      return this.contextManager.createChild(customSpanId);
    } catch (error) {
      this.error('Error creating child context', error as Error);
      return undefined;
    }
  }

  /**
   * 주어진 컨텍스트에서 함수를 실행한다.
   */
  runWithContext<T>(context: ITraceContext, fn: () => T): T {
    try {
      return this.contextManager.run(context, fn);
    } catch (error) {
      this.error('Error running with context', error as Error);
      throw error;
    }
  }

  /**
   * 주어진 컨텍스트에서 비동기 함수를 실행한다.
   */
  async runWithContextAsync<T>(
    context: ITraceContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.contextManager.runAsync(context, fn);
    } catch (error) {
      this.error('Error running with context', error as Error);
      throw error;
    }
  }

  /**
   * 새로운 컨텍스트를 생성한다.
   */
  createContext(
    traceId: string,
    spanId?: string,
    parentSpanId?: string,
  ): ITraceContext {
    try {
      return this.contextManager.create(traceId, spanId, parentSpanId);
    } catch (error) {
      this.error('Error creating context', error as Error);
      throw error;
    }
  }

  /**
   * 주어진 trace ID가 현재 trace와 일치하는지 확인한다.
   */
  isSameTrace(traceId: string): boolean {
    try {
      return this.contextManager.isSameTrace(traceId);
    } catch (error) {
      this.error('Error checking trace ID', error as Error);
      return false;
    }
  }

  /**
   * 현재 컨텍스트 정보를 로그한다.
   */
  logContext(): void {
    const context = this.getContext();
    if (context) {
      this.log(
        `Trace Context: traceId=${context.traceId}, spanId=${context.spanId}, parentSpanId=${context.parentSpanId || 'none'}`,
        context,
      );
    } else {
      this.warn('No trace context available');
    }
  }

  /**
   * 컨텍스트와 함께 로그를 기록한다.
   */
  log(message: string, context?: ITraceContext): void {
    const traceInfo = context ?? this.getContext();
    if (traceInfo) {
      this.logger.log(`${message} [traceId=${traceInfo.traceId}, spanId=${traceInfo.spanId}]`);
    } else {
      this.logger.log(message);
    }
  }

  /**
   * 컨텍스트와 함께 에러 로그를 기록한다.
   */
  error(message: string, error?: Error, context?: ITraceContext): void {
    const traceInfo = context ?? this.getContext();
    if (traceInfo) {
      this.logger.error(
        `${message} [traceId=${traceInfo.traceId}, spanId=${traceInfo.spanId}]`,
        error,
      );
    } else {
      this.logger.error(message, error);
    }
  }

  /**
   * 컨텍스트와 함께 경고 로그를 기록한다.
   */
  warn(message: string, context?: ITraceContext): void {
    const traceInfo = context ?? this.getContext();
    if (traceInfo) {
      this.logger.warn(`${message} [traceId=${traceInfo.traceId}, spanId=${traceInfo.spanId}]`);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * 컨텍스트와 함께 디버그 로그를 기록한다.
   */
  debug(message: string, context?: ITraceContext): void {
    const traceInfo = context ?? this.getContext();
    if (traceInfo) {
      this.logger.debug(`${message} [traceId=${traceInfo.traceId}, spanId=${traceInfo.spanId}]`);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * 컨텍스트와 함께 상세 로그를 기록한다.
   */
  verbose(message: string, context?: ITraceContext): void {
    const traceInfo = context ?? this.getContext();
    if (traceInfo) {
      this.logger.verbose(`${message} [traceId=${traceInfo.traceId}, spanId=${traceInfo.spanId}]`);
    } else {
      this.logger.verbose(message);
    }
  }
}