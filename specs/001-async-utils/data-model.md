# Data Model: @npm-library/async-utils

**Date**: 2025-12-05
**Feature**: 001-async-utils

## 1. Core Types

### 1.1 Retry Types

```typescript
/**
 * 재시도 전략 인터페이스
 * OCP 원칙에 따라 확장 가능한 전략 패턴
 */
export interface RetryStrategy {
  /**
   * 주어진 에러와 시도 횟수에서 재시도 여부 결정
   * @param error - 발생한 에러
   * @param attempt - 현재 시도 횟수 (0-based)
   * @param maxAttempts - 최대 재시도 횟수
   */
  shouldRetry(error: Error, attempt: number, maxAttempts: number): boolean;

  /**
   * 다음 재시도까지 대기 시간 계산 (밀리초)
   * @param attempt - 현재 시도 횟수 (0-based)
   */
  getDelay(attempt: number): number;
}

/**
 * 재시도 옵션
 */
export interface RetryOptions {
  /** 최대 재시도 횟수 (기본값: 3, 총 4회 시도) */
  maxAttempts?: number;

  /** 백오프 전략 (기본값: ExponentialBackoff) */
  strategy?: RetryStrategy;

  /**
   * 재시도 조건 필터
   * true 반환 시 재시도, false 반환 시 즉시 실패
   */
  retryIf?: (error: Error) => boolean;

  /** AbortSignal for cancellation */
  signal?: AbortSignal;

  /** 재시도 발생 시 콜백 */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * 지수 백오프 설정
 */
export interface ExponentialBackoffOptions {
  /** 기본 지연 시간 (기본값: 100ms) */
  baseDelay?: number;

  /** 최대 지연 시간 (기본값: 10000ms) */
  maxDelay?: number;

  /** 증가 배율 (기본값: 2) */
  multiplier?: number;

  /** 지터(jitter) 사용 여부 (기본값: false) */
  jitter?: boolean;
}

/**
 * 선형 백오프 설정
 */
export interface LinearBackoffOptions {
  /** 고정 지연 시간 (기본값: 1000ms) */
  delay?: number;
}
```

### 1.2 Timeout Types

```typescript
/**
 * 타임아웃 옵션
 */
export interface TimeoutOptions<T = unknown> {
  /** 타임아웃 시간 (밀리초) */
  milliseconds: number;

  /**
   * 타임아웃 시 반환할 폴백 값 또는 함수
   * 설정 시 TimeoutError 대신 이 값을 반환
   */
  fallback?: T | (() => T | Promise<T>);

  /** AbortSignal for cancellation */
  signal?: AbortSignal;

  /** 타임아웃 발생 시 콜백 */
  onTimeout?: () => void;

  /**
   * 타임아웃 발생 시 정리 함수
   * 원본 Promise가 아직 실행 중일 때 리소스 정리용
   */
  cleanup?: () => void | Promise<void>;
}
```

### 1.3 Concurrency Types

```typescript
/**
 * 동시성 제한 함수 인터페이스
 */
export interface LimitFunction {
  /**
   * 동시성 제한 내에서 함수 실행
   * @param fn - 실행할 비동기 함수
   * @param options - 실행 옵션 (우선순위 등)
   */
  <T>(fn: () => Promise<T>, options?: LimitTaskOptions): Promise<T>;

  /** 현재 실행 중인 작업 수 */
  readonly activeCount: number;

  /** 대기 중인 작업 수 */
  readonly pendingCount: number;

  /** 대기 큐 비우기 (대기 중인 작업은 AbortError로 reject) */
  clearQueue(): void;

  /** 동시성 제한 동적 조정 */
  setConcurrency(concurrency: number): void;
}

/**
 * 작업 실행 옵션
 */
export interface LimitTaskOptions {
  /**
   * 우선순위 (0-10, 숫자가 클수록 높은 우선순위)
   * 기본값: 5
   */
  priority?: number;
}

/**
 * 우선순위 큐 아이템
 * @internal
 */
export interface QueueItem<T> {
  fn: () => Promise<T>;
  priority: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}
```

### 1.4 Error Types

```typescript
/**
 * 모든 재시도 실패 시 발생하는 에러
 */
export class RetryError extends Error {
  readonly name = 'RetryError';

  constructor(
    message: string,
    /** 총 시도 횟수 */
    public readonly attempts: number,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/**
 * 타임아웃 발생 시 발생하는 에러
 */
export class TimeoutError extends Error {
  readonly name = 'TimeoutError';

  constructor(
    message: string = 'Operation timed out',
    /** 타임아웃 시간 (밀리초) */
    public readonly milliseconds?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

/**
 * 사용자 취소 시 발생하는 에러
 */
export class AbortError extends Error {
  readonly name = 'AbortError';

  constructor(
    message: string = 'Operation was aborted',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}
```

## 2. NestJS Integration Types

### 2.1 Module Options

```typescript
/**
 * AsyncUtilsModule 전역 설정
 */
export interface AsyncUtilsModuleOptions {
  /** 전역 재시도 설정 */
  retry?: RetryOptions;

  /** 전역 타임아웃 설정 */
  timeout?: Pick<TimeoutOptions, 'milliseconds' | 'onTimeout'>;

  /** 전역 동시성 설정 */
  concurrency?: {
    /** 기본 동시성 제한 */
    defaultLimit?: number;
  };
}

/**
 * 비동기 모듈 설정 옵션
 */
export interface AsyncUtilsModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (
    ...args: any[]
  ) => Promise<AsyncUtilsModuleOptions> | AsyncUtilsModuleOptions;
}
```

### 2.2 Decorator Options

```typescript
/**
 * @Retryable() 데코레이터 옵션
 */
export interface RetryableOptions {
  /** 최대 재시도 횟수 */
  maxAttempts?: number;

  /** 백오프 전략 이름 또는 인스턴스 */
  strategy?: 'exponential' | 'linear' | RetryStrategy;

  /** 재시도 조건 */
  retryIf?: (error: Error) => boolean;

  /** 재시도 콜백 */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * @Timeout() 데코레이터 옵션
 */
export interface TimeoutDecoratorOptions {
  /** 타임아웃 시간 (밀리초) 또는 ConfigService 키 */
  milliseconds: number | string;

  /** 타임아웃 콜백 */
  onTimeout?: () => void;
}

/**
 * @ConcurrencyLimit() 데코레이터 옵션
 */
export interface ConcurrencyLimitOptions {
  /** 동시성 제한 */
  limit: number;

  /**
   * 동시성 스코프
   * - 'class': 클래스 인스턴스당 하나의 limit 공유
   * - 'method': 메서드당 별도의 limit
   * - 'global': 전역 limit 공유
   */
  scope?: 'class' | 'method' | 'global';
}
```

## 3. Entity Relationships

```
┌─────────────────┐
│  RetryOptions   │
├─────────────────┤         ┌──────────────────┐
│ maxAttempts     │────────▶│  RetryStrategy   │
│ strategy        │         ├──────────────────┤
│ retryIf         │         │ shouldRetry()    │
│ signal          │         │ getDelay()       │
│ onRetry         │         └──────────────────┘
└─────────────────┘                  ▲
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
           ┌────────┴───────┐ ┌──────┴──────┐ ┌──────┴──────┐
           │ Exponential    │ │   Linear    │ │   Custom    │
           │ Backoff        │ │   Backoff   │ │  Strategy   │
           └────────────────┘ └─────────────┘ └─────────────┘

┌─────────────────┐
│ TimeoutOptions  │
├─────────────────┤
│ milliseconds    │
│ fallback        │
│ signal          │
│ onTimeout       │
│ cleanup         │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  LimitFunction  │────────▶│  PriorityQueue  │
├─────────────────┤         ├─────────────────┤
│ activeCount     │         │ enqueue()       │
│ pendingCount    │         │ dequeue()       │
│ clearQueue()    │         │ size            │
│ setConcurrency()│         │ clear()         │
└─────────────────┘         └─────────────────┘
                                    │
                                    ▼
                            ┌─────────────────┐
                            │   QueueItem     │
                            ├─────────────────┤
                            │ fn              │
                            │ priority        │
                            │ resolve         │
                            │ reject          │
                            └─────────────────┘

Error Hierarchy:
┌─────────────────┐
│      Error      │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────┐ ┌─────────┐ ┌─────────┐
│ Retry  │ │ Timeout │ │  Abort  │
│ Error  │ │  Error  │ │  Error  │
└────────┘ └─────────┘ └─────────┘
```

## 4. State Transitions

### 4.1 Retry State Machine

```
           ┌─────────────┐
           │   IDLE      │
           └──────┬──────┘
                  │ execute()
                  ▼
           ┌─────────────┐
      ┌───▶│  RUNNING    │◀───┐
      │    └──────┬──────┘    │
      │           │           │
      │     ┌─────┴─────┐     │
      │     ▼           ▼     │
      │ ┌───────┐  ┌────────┐ │
      │ │SUCCESS│  │ FAILED │ │
      │ └───────┘  └────┬───┘ │
      │                 │     │
      │           ┌─────┴─────┐
      │           ▼           │
      │    ┌─────────────┐    │
      │    │  WAITING    │────┘
      │    │  (backoff)  │ delay elapsed
      │    └─────────────┘
      │
      └─── abort signal ───────────────┐
                                       ▼
                                ┌─────────────┐
                                │  ABORTED    │
                                └─────────────┘
```

### 4.2 Limit Queue State

```
┌───────────────────────────────────────────────────────┐
│                    QUEUE STATE                         │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────┐  enqueue()   ┌─────────┐                 │
│  │ PENDING │─────────────▶│ QUEUED  │                 │
│  └─────────┘              └────┬────┘                 │
│                                │                       │
│                         slot available                 │
│                                │                       │
│                                ▼                       │
│                          ┌─────────┐                  │
│                          │ RUNNING │                  │
│                          └────┬────┘                  │
│                               │                        │
│                    ┌──────────┴──────────┐            │
│                    ▼                     ▼            │
│              ┌──────────┐          ┌──────────┐       │
│              │ RESOLVED │          │ REJECTED │       │
│              └──────────┘          └──────────┘       │
│                                                        │
│  clearQueue() ────▶ All QUEUED → REJECTED (AbortError)│
│                                                        │
└───────────────────────────────────────────────────────┘
```

## 5. Validation Rules

### 5.1 RetryOptions Validation

| Field | Rule | Error |
|-------|------|-------|
| maxAttempts | >= 0 | RangeError: maxAttempts must be >= 0 |
| strategy | instanceof RetryStrategy | TypeError: strategy must implement RetryStrategy |

### 5.2 TimeoutOptions Validation

| Field | Rule | Error |
|-------|------|-------|
| milliseconds | > 0 | RangeError: milliseconds must be > 0 |

### 5.3 pLimit Validation

| Field | Rule | Error |
|-------|------|-------|
| concurrency | >= 1 | RangeError: concurrency must be >= 1 |
| priority | 0-10 | RangeError: priority must be between 0 and 10 |

## 6. Default Values

| Entity | Field | Default Value |
|--------|-------|---------------|
| RetryOptions | maxAttempts | 3 |
| RetryOptions | strategy | ExponentialBackoff |
| ExponentialBackoff | baseDelay | 100 |
| ExponentialBackoff | maxDelay | 10000 |
| ExponentialBackoff | multiplier | 2 |
| LinearBackoff | delay | 1000 |
| LimitTaskOptions | priority | 5 |
