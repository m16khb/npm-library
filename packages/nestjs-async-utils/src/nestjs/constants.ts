/**
 * NestJS Async Utils - DI 토큰 및 메타데이터 키
 */

/**
 * 모듈 옵션 DI 토큰
 */
export const ASYNC_UTILS_MODULE_OPTIONS = Symbol('ASYNC_UTILS_MODULE_OPTIONS');

/**
 * @Retryable 데코레이터 메타데이터 키
 */
export const RETRYABLE_OPTIONS = Symbol('RETRYABLE_OPTIONS');

/**
 * @Timeout 데코레이터 메타데이터 키
 */
export const TIMEOUT_OPTIONS = Symbol('TIMEOUT_OPTIONS');

/**
 * @ConcurrencyLimit 데코레이터 메타데이터 키
 */
export const CONCURRENCY_LIMIT_OPTIONS = Symbol('CONCURRENCY_LIMIT_OPTIONS');
