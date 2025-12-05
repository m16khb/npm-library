import type {Type, LoggerService} from '@nestjs/common';

/**
 * AsyncUtilsModule 전역 설정 옵션
 *
 * @example
 * ```typescript
 * // 기본 사용
 * AsyncUtilsModule.forRoot({
 *   defaultRetries: 5,
 *   defaultTimeout: 10000,
 *   defaultConcurrency: 20,
 *   enableLogging: true,
 * })
 *
 * // 커스텀 로거 사용 (LoggerService)
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
 *
 * // 글로벌 모듈 비활성화
 * AsyncUtilsModule.forRoot({
 *   isGlobal: false, // 기본값: true
 * })
 * ```
 */
export interface AsyncUtilsModuleOptions {
  /**
   * 글로벌 모듈로 등록할지 여부
   * @default true
   */
  isGlobal?: boolean;

  /**
   * 기본 재시도 횟수
   * @default 3
   */
  defaultRetries?: number;

  /**
   * 기본 타임아웃 (밀리초)
   * @default 30000
   */
  defaultTimeout?: number;

  /**
   * 기본 동시성 제한
   * @default 10
   */
  defaultConcurrency?: number;

  /**
   * 전역 로깅 활성화
   * @default false
   */
  enableLogging?: boolean;

  /**
   * 커스텀 로거 (NestJS LoggerService 인터페이스)
   *
   * LoggerService를 구현한 커스텀 로거를 주입합니다.
   * 설정하지 않으면 NestJS 기본 Logger를 사용합니다.
   *
   * @example
   * ```typescript
   * import { ConsoleLogger } from '@nestjs/common';
   *
   * class CustomLogger extends ConsoleLogger {
   *   log(message: string, context?: string) {
   *     super.log(`[Custom] ${message}`, context);
   *   }
   * }
   *
   * AsyncUtilsModule.forRoot({
   *   logger: new CustomLogger(),
   *   enableLogging: true,
   * })
   * ```
   */
  logger?: LoggerService;

  /**
   * 간단한 로거 함수
   *
   * LoggerService보다 간단하게 로깅 함수만 지정하고 싶을 때 사용합니다.
   * logger와 loggerFn이 모두 설정된 경우 loggerFn이 우선합니다.
   *
   * @example
   * ```typescript
   * AsyncUtilsModule.forRoot({
   *   loggerFn: (message, context) => {
   *     console.log(`[${context}] ${message}`);
   *   },
   *   enableLogging: true,
   * })
   * ```
   */
  loggerFn?: (message: string, context?: string) => void;
}

/**
 * forRootAsync 옵션
 *
 * @example
 * ```typescript
 * AsyncUtilsModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     defaultTimeout: config.get('ASYNC_TIMEOUT'),
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
export interface AsyncUtilsModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<AsyncUtilsModuleOptions> | AsyncUtilsModuleOptions;
  inject?: any[];
  useClass?: Type<AsyncUtilsOptionsFactory>;
  useExisting?: Type<AsyncUtilsOptionsFactory>;
  isGlobal?: boolean;
}

/**
 * 옵션 팩토리 인터페이스 (useClass/useExisting용)
 */
export interface AsyncUtilsOptionsFactory {
  createAsyncUtilsOptions(): Promise<AsyncUtilsModuleOptions> | AsyncUtilsModuleOptions;
}
