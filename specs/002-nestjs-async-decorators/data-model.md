# Data Model: NestJS 비동기 유틸리티 데코레이터

**Feature Branch**: `002-nestjs-async-decorators`
**Date**: 2025-12-05

## 1. 핵심 인터페이스

### 1.1 모듈 옵션

```typescript
/**
 * AsyncUtilsModule 전역 설정 옵션
 */
export interface AsyncUtilsModuleOptions {
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
   * 커스텀 로거 함수
   * 설정하지 않으면 NestJS Logger 사용
   */
  logger?: (message: string, context?: string) => void;
}

/**
 * forRootAsync 옵션
 */
export interface AsyncUtilsModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<AsyncUtilsModuleOptions> | AsyncUtilsModuleOptions;
  inject?: any[];
  useClass?: Type<AsyncUtilsOptionsFactory>;
  useExisting?: Type<AsyncUtilsOptionsFactory>;
}

/**
 * 옵션 팩토리 인터페이스
 */
export interface AsyncUtilsOptionsFactory {
  createAsyncUtilsOptions(): Promise<AsyncUtilsModuleOptions> | AsyncUtilsModuleOptions;
}
```

### 1.2 Retryable 옵션

```typescript
import { RetryStrategy, RetryFilter } from '../core/retry/types';

/**
 * @Retryable() 데코레이터 옵션
 */
export interface RetryableOptions {
  /**
   * 최대 재시도 횟수 (초기 시도 제외)
   * @default 모듈 기본값 또는 3
   */
  retries?: number;

  /**
   * 재시도 지연 전략
   * Core의 exponentialBackoff, linearBackoff 등 사용 가능
   * @default exponentialBackoff(100, 10000, 2)
   */
  strategy?: RetryStrategy;

  /**
   * 재시도 조건 함수
   * true 반환 시 재시도, false 반환 시 즉시 실패
   * @default defaultRetryFilter (네트워크/일시적 에러만 재시도)
   */
  retryWhen?: RetryFilter;

  /**
   * 특정 에러 클래스들만 재시도
   * retryWhen보다 간단한 대안
   */
  retryOn?: Array<new (...args: any[]) => Error>;

  /**
   * 이 데코레이터에 대한 로깅 활성화
   * @default 모듈 전역 설정 따름
   */
  enableLogging?: boolean;

  /**
   * 재시도 시 호출되는 콜백
   */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}
```

### 1.3 Timeout 옵션

```typescript
/**
 * @Timeout() 데코레이터 옵션
 */
export interface TimeoutOptions {
  /**
   * 타임아웃 시간 (밀리초)
   * @default 모듈 기본값 또는 30000
   */
  milliseconds?: number;

  /**
   * 타임아웃 시 에러 메시지
   * @default "Operation timed out"
   */
  message?: string;

  /**
   * 이 데코레이터에 대한 로깅 활성화
   * @default 모듈 전역 설정 따름
   */
  enableLogging?: boolean;

  /**
   * 타임아웃 발생 시 호출되는 콜백
   */
  onTimeout?: (methodName: string, timeout: number) => void;
}

/**
 * @Timeout(5000) 형태의 간단한 사용을 위한 타입
 */
export type TimeoutOptionsOrMilliseconds = number | TimeoutOptions;
```

### 1.4 ConcurrencyLimit 옵션

```typescript
/**
 * @ConcurrencyLimit() 데코레이터 옵션
 */
export interface ConcurrencyLimitOptions {
  /**
   * 최대 동시 실행 수
   * @default 모듈 기본값 또는 10
   */
  limit?: number;

  /**
   * 대기열 타임아웃 (밀리초)
   * 이 시간 내에 슬롯을 얻지 못하면 에러 발생
   * @default undefined (무한 대기)
   */
  queueTimeout?: number;

  /**
   * 이 데코레이터에 대한 로깅 활성화
   * @default 모듈 전역 설정 따름
   */
  enableLogging?: boolean;
}

/**
 * @ConcurrencyLimit(5) 형태의 간단한 사용을 위한 타입
 */
export type ConcurrencyLimitOptionsOrNumber = number | ConcurrencyLimitOptions;
```

---

## 2. 메타데이터 키 상수

```typescript
/**
 * DI 토큰
 */
export const ASYNC_UTILS_MODULE_OPTIONS = Symbol('ASYNC_UTILS_MODULE_OPTIONS');

/**
 * 메타데이터 키
 */
export const RETRYABLE_OPTIONS = Symbol('RETRYABLE_OPTIONS');
export const TIMEOUT_OPTIONS = Symbol('TIMEOUT_OPTIONS');
export const CONCURRENCY_LIMIT_OPTIONS = Symbol('CONCURRENCY_LIMIT_OPTIONS');
```

---

## 3. 내부 상태 모델

### 3.1 동시성 관리자 상태

```typescript
/**
 * 메서드별 동시성 제한 함수를 관리하는 Map의 값 타입
 */
interface ConcurrencyEntry {
  limiter: LimitFunction;  // pLimit 인스턴스
  concurrency: number;     // 설정된 동시성 제한
  createdAt: number;       // 생성 시간
}

/**
 * ConcurrencyManagerService 내부 상태
 * Key: "ClassName.methodName"
 */
type ConcurrencyMap = Map<string, ConcurrencyEntry>;
```

### 3.2 동시성 상태 (외부 노출용)

```typescript
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
```

---

## 4. 데코레이터 적용 후 메서드 시그니처

데코레이터 적용 전후로 메서드 시그니처는 변경되지 않음 (LSP 준수):

```typescript
// Before decorator
class PaymentService {
  async processPayment(orderId: string, amount: number): Promise<PaymentResult> {
    // 비즈니스 로직
  }
}

// After decorator - 시그니처 동일
class PaymentService {
  @Retryable({ retries: 3 })
  @Timeout(5000)
  @ConcurrencyLimit(5)
  async processPayment(orderId: string, amount: number): Promise<PaymentResult> {
    // 비즈니스 로직 변경 없음
  }
}
```

---

## 5. 에러 타입 (Core 재사용)

```typescript
// core/errors에서 재사용
export { RetryError } from '../core/errors/retry-error';
export { TimeoutError } from '../core/errors/timeout-error';
export { AbortError } from '../core/errors/abort-error';

/**
 * 대기열 타임아웃 시 발생하는 에러
 * (신규 - ConcurrencyLimit 전용)
 */
export class QueueTimeoutError extends Error {
  name = 'QueueTimeoutError';
  code = 'QUEUE_TIMEOUT';

  constructor(
    public readonly methodName: string,
    public readonly queueTimeout: number,
  ) {
    super(`Queue timeout after ${queueTimeout}ms for ${methodName}`);
  }

  static isQueueTimeoutError(error: unknown): error is QueueTimeoutError {
    return error instanceof QueueTimeoutError;
  }
}
```

---

## 6. 설정 병합 우선순위

```
데코레이터 옵션 > 클래스 레벨 설정 > 모듈 전역 설정 > 라이브러리 기본값
```

```typescript
// 최종 옵션 계산 예시
const finalOptions = {
  retries: decoratorOptions?.retries
    ?? classOptions?.retries
    ?? moduleOptions?.defaultRetries
    ?? LIBRARY_DEFAULTS.retries,  // 3
  timeout: decoratorOptions?.milliseconds
    ?? classOptions?.timeout
    ?? moduleOptions?.defaultTimeout
    ?? LIBRARY_DEFAULTS.timeout,  // 30000
  concurrency: decoratorOptions?.limit
    ?? classOptions?.concurrency
    ?? moduleOptions?.defaultConcurrency
    ?? LIBRARY_DEFAULTS.concurrency,  // 10
};
```

---

## 7. 라이브러리 기본값

```typescript
/**
 * 라이브러리 하드코딩 기본값
 * 모듈 설정 없이 데코레이터만 사용해도 동작하도록 함
 */
export const LIBRARY_DEFAULTS = {
  retries: 3,
  timeout: 30000,       // 30초
  concurrency: 10,
  enableLogging: false,
} as const;
```

---

## 8. 타입 내보내기 구조

```typescript
// packages/async-utils/src/nestjs/index.ts

// 모듈
export { AsyncUtilsModule } from './async-utils.module';

// 데코레이터
export { Retryable } from './decorators/retryable.decorator';
export { Timeout } from './decorators/timeout.decorator';
export { ConcurrencyLimit } from './decorators/concurrency-limit.decorator';

// 인터페이스
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
} from './interfaces';

// 상수
export {
  ASYNC_UTILS_MODULE_OPTIONS,
  RETRYABLE_OPTIONS,
  TIMEOUT_OPTIONS,
  CONCURRENCY_LIMIT_OPTIONS,
} from './constants';

// 에러
export { QueueTimeoutError } from './errors/queue-timeout-error';

// Core 에러 재내보내기
export { RetryError, TimeoutError, AbortError } from '../core';
```

---

## 9. 엔티티 관계도

```
AsyncUtilsModule
├── provides: ASYNC_UTILS_MODULE_OPTIONS (AsyncUtilsModuleOptions)
├── provides: ConcurrencyManagerService
│   └── manages: Map<string, ConcurrencyEntry>
│       └── contains: LimitFunction (from pLimit)
└── provides: Interceptors (not directly, via decorators)

Decorators (메타데이터 설정 + 인터셉터 적용)
├── @Retryable(options?: RetryableOptions)
│   └── sets: RETRYABLE_OPTIONS metadata
│   └── uses: RetryableInterceptor
├── @Timeout(options?: TimeoutOptionsOrMilliseconds)
│   └── sets: TIMEOUT_OPTIONS metadata
│   └── uses: TimeoutInterceptor
└── @ConcurrencyLimit(options?: ConcurrencyLimitOptionsOrNumber)
    └── sets: CONCURRENCY_LIMIT_OPTIONS metadata
    └── uses: ConcurrencyLimitInterceptor

Interceptors (실제 로직 실행)
├── RetryableInterceptor
│   └── uses: retry() from core
├── TimeoutInterceptor
│   └── uses: pTimeout() from core
└── ConcurrencyLimitInterceptor
    └── uses: ConcurrencyManagerService
        └── uses: pLimit() from core
```
