import { Inject, Injectable, LoggerService as NestLoggerService, Optional } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * 로그 레벨 정의
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'query' | 'debug' | 'verbose';

/**
 * 로그 메타데이터 타입
 */
export type LogMeta = Record<string, unknown>;

/**
 * TraceableLogger - Winston 기반 NestJS 호환 로거
 *
 * nest-winston을 통해 Winston 로거를 사용하며, CLS 컨텍스트에서
 * traceId는 LoggerModule의 Winston format에서 자동으로 주입됩니다.
 *
 * @example
 * ```typescript
 * // 기본 사용
 * @Injectable()
 * export class PaymentService {
 *   private readonly logger: TraceableLogger;
 *
 *   constructor(logger: TraceableLogger) {
 *     this.logger = logger.setContext('PaymentService');
 *   }
 *
 *   async process(orderId: string) {
 *     this.logger.log('결제 처리 시작', { orderId });
 *     // [Nest] 12345 - 2025. 1. 1. 오후 3:00:00.123 LOG [PaymentService] [abc12345] 결제 처리 시작
 *
 *     try {
 *       await this.doPayment();
 *       this.logger.log('결제 완료', { orderId, amount: 10000 });
 *     } catch (error) {
 *       this.logger.error('결제 실패', error);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // SQL 쿼리 로깅
 * this.logger.query('SELECT * FROM orders WHERE id = ?', { params: [123], duration: 15 });
 * // [Nest] 12345 - 2025. 1. 1. 오후 3:00:00.123 QUERY [TypeORM] [abc12345] SELECT * FROM orders...
 *
 * // Slow Query 경고
 * this.logger.slowQuery('SELECT * FROM large_table', 5000);
 * // [Nest] 12345 - 2025. 1. 1. 오후 3:00:00.123 WARN [TypeORM] [abc12345] [SlowQuery] SELECT...
 * ```
 */
@Injectable()
export class TraceableLogger implements NestLoggerService {
  private context?: string;

  constructor(
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger?: Logger,
  ) {}

  /**
   * 컨텍스트 설정 (보통 클래스명)
   * 새 인스턴스를 반환하여 싱글톤 오염 방지
   */
  setContext(context: string): TraceableLogger {
    return this.child(context);
  }

  /**
   * 자식 로거 생성 (새 컨텍스트로)
   */
  child(context: string): TraceableLogger {
    const childLogger = new TraceableLogger(this.winstonLogger);
    childLogger.context = context;
    return childLogger;
  }

  /**
   * INFO 레벨 로그
   * @param message - 로그 메시지
   * @param meta - 선택적 메타데이터 객체
   */
  log(message: string, meta?: LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('info', message, meta);
      return;
    }
    this.winstonLogger.info({
      message,
      context: this.context,
      ...meta,
    });
  }

  /**
   * ERROR 레벨 로그
   * @param message - 로그 메시지
   * @param errorOrMeta - Error 객체 또는 메타데이터 객체
   *
   * Error 객체가 전달되면 `error` (메시지)와 `stack`을 자동 추출
   */
  error(message: string, errorOrMeta?: Error | LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('error', message, errorOrMeta);
      return;
    }
    if (errorOrMeta instanceof Error) {
      this.winstonLogger.error({
        message,
        context: this.context,
        error: errorOrMeta.message,
        stack: errorOrMeta.stack,
      });
    } else {
      this.winstonLogger.error({
        message,
        context: this.context,
        ...errorOrMeta,
      });
    }
  }

  /**
   * WARN 레벨 로그
   * @param message - 로그 메시지
   * @param meta - 선택적 메타데이터 객체
   */
  warn(message: string, meta?: LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('warn', message, meta);
      return;
    }
    this.winstonLogger.warn({
      message,
      context: this.context,
      ...meta,
    });
  }

  /**
   * DEBUG 레벨 로그
   * @param message - 로그 메시지
   * @param meta - 선택적 메타데이터 객체
   */
  debug(message: string, meta?: LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('debug', message, meta);
      return;
    }
    this.winstonLogger.debug({
      message,
      context: this.context,
      ...meta,
    });
  }

  /**
   * VERBOSE 레벨 로그
   * @param message - 로그 메시지
   * @param meta - 선택적 메타데이터 객체
   */
  verbose(message: string, meta?: LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('verbose', message, meta);
      return;
    }
    this.winstonLogger.verbose({
      message,
      context: this.context,
      ...meta,
    });
  }

  /**
   * QUERY 레벨 로그 (TypeORM SQL 쿼리용)
   * @param message - SQL 쿼리 또는 로그 메시지
   * @param meta - 선택적 메타데이터 (parameters, duration 등)
   */
  query(message: string, meta?: LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('query', message, meta);
      return;
    }
    // Winston의 log 메서드를 사용하여 커스텀 레벨 지정
    this.winstonLogger.log('query', {
      message,
      context: this.context ?? 'TypeORM',
      ...meta,
    });
  }

  /**
   * Slow Query 로그 (WARN 레벨로 출력)
   * @param message - SQL 쿼리
   * @param durationMs - 쿼리 실행 시간 (밀리초)
   * @param meta - 선택적 메타데이터
   */
  slowQuery(message: string, durationMs: number, meta?: LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('warn', `[SlowQuery] ${message}`, { durationMs, slow: true, ...meta });
      return;
    }
    this.winstonLogger.warn({
      message: `[SlowQuery] ${message}`,
      context: this.context ?? 'TypeORM',
      durationMs,
      slow: true,
      ...meta,
    });
  }

  /**
   * FATAL 레벨 로그 (error로 출력, fatal 플래그 추가)
   * @param message - 로그 메시지
   * @param errorOrMeta - Error 객체 또는 메타데이터 객체
   */
  fatal(message: string, errorOrMeta?: Error | LogMeta): void {
    if (!this.winstonLogger) {
      this.fallbackLog('error', `[FATAL] ${message}`, errorOrMeta);
      return;
    }
    if (errorOrMeta instanceof Error) {
      this.winstonLogger.error({
        message,
        context: this.context,
        fatal: true,
        error: errorOrMeta.message,
        stack: errorOrMeta.stack,
      });
    } else {
      this.winstonLogger.error({
        message,
        context: this.context,
        fatal: true,
        ...errorOrMeta,
      });
    }
  }

  /**
   * Winston이 주입되지 않았을 때 fallback 로깅
   */
  private fallbackLog(level: string, message: string, meta?: unknown): void {
    const timestamp = new Date().toISOString();
    const context = this.context ?? 'Application';
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const output = `[${timestamp}] ${level.toUpperCase()} [${context}] ${message}${metaStr}`;

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else if (level === 'debug' || level === 'verbose') {
      console.debug(output);
    } else {
      console.log(output);
    }
  }
}
