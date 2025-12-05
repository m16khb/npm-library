import {Injectable, Inject, Optional, Logger} from '@nestjs/common';
import type {LoggerService} from '@nestjs/common';

import {ASYNC_UTILS_MODULE_OPTIONS} from '../constants.js';
import type {AsyncUtilsModuleOptions} from '../interfaces/module-options.interface.js';

/**
 * AsyncUtils 전용 로거 서비스
 *
 * 커스텀 로거가 설정되어 있으면 해당 로거를 사용하고,
 * 그렇지 않으면 NestJS 기본 Logger를 사용합니다.
 *
 * @example
 * ```typescript
 * // NestJS LoggerService 사용
 * AsyncUtilsModule.forRoot({
 *   logger: new CustomLogger(), // LoggerService 구현체
 *   enableLogging: true,
 * })
 *
 * // 간단한 함수 로거 사용
 * AsyncUtilsModule.forRoot({
 *   loggerFn: (message, context) => console.log(`[${context}] ${message}`),
 *   enableLogging: true,
 * })
 * ```
 */
@Injectable()
export class AsyncUtilsLoggerService {
  private readonly defaultLogger = new Logger('AsyncUtils');
  private readonly customLogger?: LoggerService;
  private readonly loggerFn?: (message: string, context?: string) => void;
  private readonly enableLogging: boolean;

  constructor(
    @Optional()
    @Inject(ASYNC_UTILS_MODULE_OPTIONS)
    moduleOptions?: AsyncUtilsModuleOptions,
  ) {
    this.customLogger = moduleOptions?.logger;
    this.loggerFn = moduleOptions?.loggerFn;
    this.enableLogging = moduleOptions?.enableLogging ?? false;
  }

  /**
   * 로그 메시지 출력
   *
   * @param message 로그 메시지
   * @param context 컨텍스트 (예: "ClassName.methodName")
   */
  log(message: string, context?: string): void {
    if (!this.enableLogging) return;

    if (this.loggerFn) {
      this.loggerFn(message, context);
    } else if (this.customLogger) {
      this.customLogger.log(message, context);
    } else {
      this.defaultLogger.log(context ? `[${context}] ${message}` : message);
    }
  }

  /**
   * 경고 메시지 출력
   */
  warn(message: string, context?: string): void {
    if (!this.enableLogging) return;

    if (this.loggerFn) {
      this.loggerFn(`[WARN] ${message}`, context);
    } else if (this.customLogger) {
      this.customLogger.warn?.(message, context);
    } else {
      this.defaultLogger.warn(context ? `[${context}] ${message}` : message);
    }
  }

  /**
   * 에러 메시지 출력
   */
  error(message: string, trace?: string, context?: string): void {
    if (this.loggerFn) {
      this.loggerFn(`[ERROR] ${message}${trace ? ` - ${trace}` : ''}`, context);
    } else if (this.customLogger) {
      this.customLogger.error?.(message, trace, context);
    } else {
      this.defaultLogger.error(context ? `[${context}] ${message}` : message, trace);
    }
  }

  /**
   * 디버그 메시지 출력
   */
  debug(message: string, context?: string): void {
    if (!this.enableLogging) return;

    if (this.loggerFn) {
      this.loggerFn(`[DEBUG] ${message}`, context);
    } else if (this.customLogger) {
      this.customLogger.debug?.(message, context);
    } else {
      this.defaultLogger.debug?.(context ? `[${context}] ${message}` : message);
    }
  }

  /**
   * 로깅이 활성화되어 있는지 확인
   */
  isEnabled(): boolean {
    return this.enableLogging;
  }
}
