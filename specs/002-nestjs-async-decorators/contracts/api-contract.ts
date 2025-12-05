/**
 * NestJS Async Utils - API Contract
 *
 * 이 파일은 라이브러리의 Public API 계약을 정의합니다.
 * 실제 구현 시 이 인터페이스를 기반으로 구현합니다.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core 타입 참조 (기존 core 모듈에서 가져옴)
// =============================================================================

import type {LimitFunction as _LimitFunction} from '../../../packages/async-utils/src/core/concurrency/types';

// Re-export for type reference (unused but kept for documentation)
type _Unused = _LimitFunction;

/**
 * 재시도 지연 전략 함수
 * @param attempt - 현재 시도 횟수 (1부터 시작)
 * @param error - 이전 시도에서 발생한 에러
 * @returns 다음 재시도까지 대기할 밀리초
 */
export type RetryStrategy = (attempt: number, error?: Error) => number;

/**
 * 재시도 조건 필터 함수
 * @param error - 발생한 에러
 * @param attempt - 현재 시도 횟수
 * @returns true면 재시도, false면 즉시 실패
 */
export type RetryFilter = (error: Error, attempt?: number) => boolean;

// =============================================================================
// Module Options
// =============================================================================

/**
 * AsyncUtilsModule 전역 설정 옵션
 *
 * @example
 * ```typescript
 * AsyncUtilsModule.forRoot({
 *   defaultRetries: 5,
 *   defaultTimeout: 10000,
 *   defaultConcurrency: 20,
 *   enableLogging: true,
 * })
 * ```
 */
export interface AsyncUtilsModuleOptions {
  /** 기본 재시도 횟수 @default 3 */
  defaultRetries?: number;

  /** 기본 타임아웃 (ms) @default 30000 */
  defaultTimeout?: number;

  /** 기본 동시성 제한 @default 10 */
  defaultConcurrency?: number;

  /** 전역 로깅 활성화 @default false */
  enableLogging?: boolean;

  /** 커스텀 로거 함수 */
  logger?: (message: string, context?: string) => void;
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
  useFactory?: (
    ...args: any[]
  ) => Promise<AsyncUtilsModuleOptions> | AsyncUtilsModuleOptions;
  inject?: any[];
  useClass?: new (...args: any[]) => AsyncUtilsOptionsFactory;
  useExisting?: new (...args: any[]) => AsyncUtilsOptionsFactory;
}

/**
 * 옵션 팩토리 인터페이스 (useClass/useExisting용)
 */
export interface AsyncUtilsOptionsFactory {
  createAsyncUtilsOptions():
    | Promise<AsyncUtilsModuleOptions>
    | AsyncUtilsModuleOptions;
}

// =============================================================================
// Decorator Options
// =============================================================================

/**
 * @Retryable() 데코레이터 옵션
 *
 * @example
 * ```typescript
 * @Retryable({
 *   retries: 3,
 *   strategy: exponentialBackoff(100, 5000),
 *   retryWhen: (error) => error.name !== 'ValidationError',
 * })
 * async fetchData() { ... }
 * ```
 */
export interface RetryableOptions {
  /** 최대 재시도 횟수 (초기 시도 제외) @default 모듈 기본값 또는 3 */
  retries?: number;

  /** 재시도 지연 전략 @default exponentialBackoff(100, 10000, 2) */
  strategy?: RetryStrategy;

  /** 재시도 조건 함수 @default defaultRetryFilter */
  retryWhen?: RetryFilter;

  /** 특정 에러 클래스들만 재시도 */
  retryOn?: Array<new (...args: any[]) => Error>;

  /** 이 데코레이터에 대한 로깅 활성화 */
  enableLogging?: boolean;

  /** 재시도 시 호출되는 콜백 */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * @Timeout() 데코레이터 옵션
 *
 * @example
 * ```typescript
 * // 간단한 사용
 * @Timeout(5000)
 *
 * // 상세 옵션
 * @Timeout({ milliseconds: 5000, message: 'API call timed out' })
 * ```
 */
export interface TimeoutOptions {
  /** 타임아웃 시간 (ms) @default 모듈 기본값 또는 30000 */
  milliseconds?: number;

  /** 타임아웃 시 에러 메시지 @default "Operation timed out" */
  message?: string;

  /** 이 데코레이터에 대한 로깅 활성화 */
  enableLogging?: boolean;

  /** 타임아웃 발생 시 호출되는 콜백 */
  onTimeout?: (methodName: string, timeout: number) => void;
}

/** @Timeout(5000) 또는 @Timeout({ milliseconds: 5000 }) 모두 지원 */
export type TimeoutOptionsOrMilliseconds = number | TimeoutOptions;

/**
 * @ConcurrencyLimit() 데코레이터 옵션
 *
 * @example
 * ```typescript
 * // 간단한 사용
 * @ConcurrencyLimit(5)
 *
 * // 상세 옵션
 * @ConcurrencyLimit({ limit: 5, queueTimeout: 10000 })
 * ```
 */
export interface ConcurrencyLimitOptions {
  /** 최대 동시 실행 수 @default 모듈 기본값 또는 10 */
  limit?: number;

  /** 대기열 타임아웃 (ms) @default undefined (무한 대기) */
  queueTimeout?: number;

  /** 이 데코레이터에 대한 로깅 활성화 */
  enableLogging?: boolean;
}

/** @ConcurrencyLimit(5) 또는 @ConcurrencyLimit({ limit: 5 }) 모두 지원 */
export type ConcurrencyLimitOptionsOrNumber = number | ConcurrencyLimitOptions;

// =============================================================================
// State Types
// =============================================================================

/**
 * 특정 메서드의 동시성 상태 정보
 */
export interface MethodConcurrencyState {
  /** 현재 실행 중인 작업 수 */
  active: number;

  /** 대기 중인 작업 수 */
  pending: number;

  /** 설정된 최대 동시성 */
  limit: number;

  /** 총 처리된 작업 수 */
  processed: number;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * 대기열 타임아웃 시 발생하는 에러
 */
export interface IQueueTimeoutError extends Error {
  name: 'QueueTimeoutError';
  code: 'QUEUE_TIMEOUT';
  methodName: string;
  queueTimeout: number;
}

// =============================================================================
// Public API Contract
// =============================================================================

/**
 * AsyncUtilsModule Public API
 */
export interface IAsyncUtilsModule {
  /**
   * 동기 설정으로 모듈 등록
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     AsyncUtilsModule.forRoot({
   *       defaultRetries: 5,
   *       enableLogging: true,
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  forRoot(options?: AsyncUtilsModuleOptions): any; // DynamicModule

  /**
   * 비동기 설정으로 모듈 등록
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     AsyncUtilsModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: (config: ConfigService) => ({
   *         defaultTimeout: config.get('ASYNC_TIMEOUT'),
   *       }),
   *       inject: [ConfigService],
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  forRootAsync(options: AsyncUtilsModuleAsyncOptions): any; // DynamicModule
}

/**
 * 데코레이터 시그니처
 */
export type RetryableDecorator = (
  options?: RetryableOptions,
) => MethodDecorator;

export type TimeoutDecorator = (
  options?: TimeoutOptionsOrMilliseconds,
) => MethodDecorator;

export type ConcurrencyLimitDecorator = (
  options?: ConcurrencyLimitOptionsOrNumber,
) => MethodDecorator;

/**
 * ConcurrencyManagerService Public API
 */
export interface IConcurrencyManagerService {
  /**
   * 특정 메서드의 동시성 상태 조회
   *
   * @param className - 클래스 이름
   * @param methodName - 메서드 이름
   * @returns 동시성 상태 또는 undefined (등록되지 않은 경우)
   */
  getState(
    className: string,
    methodName: string,
  ): MethodConcurrencyState | undefined;

  /**
   * 모든 메서드의 동시성 상태 조회
   *
   * @returns 메서드별 동시성 상태 Map
   */
  getAllStates(): Map<string, MethodConcurrencyState>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * DI 토큰
 */
export const ASYNC_UTILS_MODULE_OPTIONS: unique symbol = Symbol(
  'ASYNC_UTILS_MODULE_OPTIONS',
);

/**
 * 메타데이터 키
 */
export const RETRYABLE_OPTIONS: unique symbol = Symbol('RETRYABLE_OPTIONS');
export const TIMEOUT_OPTIONS: unique symbol = Symbol('TIMEOUT_OPTIONS');
export const CONCURRENCY_LIMIT_OPTIONS: unique symbol = Symbol(
  'CONCURRENCY_LIMIT_OPTIONS',
);

/**
 * 라이브러리 기본값
 */
export const LIBRARY_DEFAULTS = {
  retries: 3,
  timeout: 30000,
  concurrency: 10,
  enableLogging: false,
} as const;

// =============================================================================
// Usage Examples (Documentation)
// =============================================================================

/**
 * @example Basic Usage
 * ```typescript
 * import {
 *   AsyncUtilsModule,
 *   Retryable,
 *   Timeout,
 *   ConcurrencyLimit,
 * } from '@npm-library/async-utils/nestjs';
 *
 * // 1. 모듈 등록
 * @Module({
 *   imports: [AsyncUtilsModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // 2. 서비스에서 데코레이터 사용
 * @Injectable()
 * export class PaymentService {
 *   @Retryable({ retries: 3 })
 *   @Timeout(5000)
 *   @ConcurrencyLimit(5)
 *   async processPayment(orderId: string): Promise<PaymentResult> {
 *     return this.paymentGateway.charge(orderId);
 *   }
 * }
 * ```
 *
 * @example Combined Decorators with Execution Order
 * ```typescript
 * // 실행 순서: ConcurrencyLimit → Retryable → Timeout
 * // 의미: 동시성 슬롯 확보 → 재시도 로직 → 각 시도에 타임아웃 적용
 *
 * @ConcurrencyLimit(5)    // 가장 바깥: 5개만 동시 실행
 * @Retryable({ retries: 3 }) // 중간: 실패 시 3회 재시도
 * @Timeout(5000)          // 가장 안쪽: 각 시도당 5초 제한
 * async callExternalApi() {
 *   return fetch('https://api.example.com/data');
 * }
 * ```
 *
 * @example Custom Retry Strategy
 * ```typescript
 * import { exponentialBackoff } from '@npm-library/async-utils/core';
 *
 * @Retryable({
 *   retries: 5,
 *   strategy: exponentialBackoff(200, 10000, 2),
 *   retryWhen: (error) => {
 *     // 비즈니스 에러는 재시도하지 않음
 *     if (error.name === 'ValidationError') return false;
 *     if (error.name === 'InsufficientFundsError') return false;
 *     return true;
 *   },
 * })
 * async chargeCustomer() { ... }
 * ```
 */
export {};
