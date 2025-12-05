/**
 * NestJS Async Utils
 *
 * NestJS 백엔드에서 @Retryable, @Timeout, @ConcurrencyLimit 데코레이터를 통해
 * 비동기 작업 제어를 선언적으로 적용할 수 있습니다.
 *
 * @packageDocumentation
 */

// 모듈
export {AsyncUtilsModule} from './async-utils.module.js';

// 데코레이터
export {Retryable, Timeout, ConcurrencyLimit} from './decorators/index.js';

// 인터셉터
export {
  RetryableInterceptor,
  TimeoutInterceptor,
  ConcurrencyLimitInterceptor,
} from './interceptors/index.js';

// 서비스
export {ConcurrencyManagerService, AsyncUtilsLoggerService} from './services/index.js';

// 인터페이스 (type only)
export type {
  AsyncUtilsModuleOptions,
  AsyncUtilsModuleAsyncOptions,
  AsyncUtilsOptionsFactory,
  RetryableOptions,
  TimeoutOptions,
  TimeoutOptionsOrMilliseconds,
  ConcurrencyLimitOptions,
  ConcurrencyLimitOptionsOrNumber,
  MethodConcurrencyState,
} from './interfaces/index.js';

// 상수
export {
  ASYNC_UTILS_MODULE_OPTIONS,
  RETRYABLE_OPTIONS,
  TIMEOUT_OPTIONS,
  CONCURRENCY_LIMIT_OPTIONS,
} from './constants.js';

// 기본값
export {LIBRARY_DEFAULTS} from './defaults.js';

// 에러
export {QueueTimeoutError} from './errors/index.js';

// Core 에러 재내보내기
export {RetryError, TimeoutError, AbortError} from '../core/index.js';
