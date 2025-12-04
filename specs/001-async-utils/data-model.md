# Data Model: Async Utils Library

## Core Interfaces

### Retry Configuration

```typescript
interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Backoff factor for exponential delay (default: 2) */
  factor?: number;
  /** Minimum delay between retries in ms (default: 1000) */
  minTimeout?: number;
  /** Maximum delay between retries in ms (default: 30000) */
  maxTimeout?: number;
  /** Add random jitter to prevent thundering herd (default: false) */
  randomize?: boolean;
  /** Callback called on each failed attempt */
  onFailedAttempt?: (error: RetryError) => void | Promise<void>;
  /** Determine if error should be retried (default: retry all) */
  shouldRetry?: (error: Error) => boolean;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}
```

### Timeout Configuration

```typescript
interface TimeoutOptions<T = unknown> {
  /** Timeout duration in milliseconds */
  milliseconds: number;
  /** Custom timeout message or error */
  message?: string | Error | false;
  /** Fallback value when timeout occurs */
  fallback?: () => T | Promise<T>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Custom timer implementations (for testing) */
  customTimers?: {
    setTimeout: (fn: () => void, ms: number) => number;
    clearTimeout: (id: number) => void;
  };
}
```

### Concurrency Control

```typescript
interface ConcurrencyLimit {
  /** Current number of active operations */
  activeCount(): number;
  /** Number of operations waiting in queue */
  pendingCount(): number;
  /** Limit a function execution */
  limit<T>(fn: () => Promise<T>): Promise<T>;
  /** Clear all pending operations */
  clearQueue(): void;
}

interface RateLimitOptions {
  /** Time window in milliseconds */
  interval: number;
  /** Maximum operations per interval */
  limit: number;
}
```

### Sleep/Delay Options

```typescript
interface SleepOptions<T = void> {
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Value to resolve with after delay */
  value?: T;
}
```

## Error Types

```typescript
class RetryError extends Error {
  constructor(
    message: string,
    public readonly attemptNumber: number,
    public readonly retriesLeft: number,
    public readonly cause: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

class TimeoutError extends Error {
  constructor(message?: string) {
    super(message || 'Operation timed out');
    this.name = 'TimeoutError';
  }
}

class AbortError extends Error {
  constructor(message?: string) {
    super(message || 'Operation was aborted');
    this.name = 'AbortError';
  }
}
```

## Utility Types

```typescript
/** Unwrap promise type */
type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

/** Async function return type */
type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  Awaited<ReturnType<T>>;

/** Result type for error handling */
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/** Abortable function type */
type AbortableFunction<T = any> = (signal: AbortSignal) => Promise<T>;
```

## State Management

### Retry State

```typescript
interface RetryState {
  attemptNumber: number;
  retriesLeft: number;
  lastError?: Error;
  startTime: number;
  nextDelay?: number;
}
```

### Concurrency State

```typescript
interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  timestamp: number;
}
```

### Rate Limit State

```typescript
interface RateLimitState {
  tokens: number;
  lastRefill: number;
  interval: number;
  limit: number;
}
```