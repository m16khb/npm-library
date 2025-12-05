# @m16khb/async-utils

[![npm version](https://img.shields.io/npm/v/@m16khb/async-utils.svg)](https://www.npmjs.com/package/@m16khb/async-utils)
[![npm downloads](https://img.shields.io/npm/dm/@m16khb/async-utils.svg)](https://www.npmjs.com/package/@m16khb/async-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

A modern, type-safe async utility library for Node.js. Provides robust retry logic, concurrency control, and timeout management with zero dependencies.

## Features

- **Retry** - Configurable retry logic with multiple backoff strategies
- **Concurrency Control** - Limit parallel executions with priority queue support
- **Timeout** - Apply timeouts to any Promise with fallback values
- **Delay** - Safe, cancellable wait functions with memory leak prevention
- **AbortSignal Support** - Full cancellation support across all utilities
- **Type-Safe** - Written in TypeScript with comprehensive type definitions
- **Zero Dependencies** - Lightweight core with no external dependencies
- **Tree-Shakeable** - ESM-only with modular exports

## Installation

```bash
# npm
npm install @m16khb/async-utils

# pnpm
pnpm add @m16khb/async-utils

# yarn
yarn add @m16khb/async-utils
```

## Requirements

- Node.js >= 20.0.0
- ESM environment (this package is ESM-only)

## Quick Start

```typescript
import { retry, pLimit, pTimeout, wait } from '@m16khb/async-utils';

// Simple delay
await wait(1000); // Wait 1 second

// Retry an API call with exponential backoff
const data = await retry(
  () => fetch('https://api.example.com/data').then(r => r.json()),
  { attempts: 3 }
);

// Limit concurrent operations
const limit = pLimit(5);
const results = await Promise.all(
  urls.map(url => limit(() => fetch(url)))
);

// Add timeout to any Promise
const result = await pTimeout(
  longRunningOperation(),
  { milliseconds: 5000, fallback: 'timeout' }
);
```

## API Reference

### Retry

Retry failed operations with configurable backoff strategies.

#### `retry<T>(fn, options?): Promise<T>`

```typescript
import { retry, exponentialBackoff } from '@m16khb/async-utils';

const result = await retry(
  async () => {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    attempts: 5,
    strategy: exponentialBackoff(100, 10000, 2),
    retryIf: (error) => error.message.includes('5'),
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt}: ${error.message}, waiting ${delay}ms`);
    },
  }
);
```

##### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attempts` | `number` | `3` | Maximum retry attempts |
| `strategy` | `RetryStrategy` | `exponentialBackoff()` | Backoff strategy function |
| `retryIf` | `(error: Error) => boolean` | `() => true` | Filter function to decide retry |
| `signal` | `AbortSignal` | - | Cancellation signal |
| `onRetry` | `(attempt, error, delay) => void` | - | Callback on each retry |
| `onSuccess` | `(attempt, result) => void` | - | Callback on success |
| `onError` | `(attempts, lastError, errors) => void` | - | Callback on final failure |

#### `retryWithState<T>(fn, options?): Promise<{ result: T; state: RetryState }>`

Returns the result along with retry state information.

```typescript
import { retryWithState } from '@m16khb/async-utils';

const { result, state } = await retryWithState(fetchData, { attempts: 3 });
console.log(`Succeeded on attempt ${state.attempt}`);
```

### Backoff Strategies

```typescript
import {
  exponentialBackoff,
  exponentialBackoffWithJitter,
  linearBackoff,
  fixedDelay,
  incrementalBackoff,
} from '@m16khb/async-utils';

// Exponential: 100ms -> 200ms -> 400ms -> 800ms (max 10s)
exponentialBackoff(100, 10000, 2);

// Exponential with jitter (±10%): reduces thundering herd
exponentialBackoffWithJitter(100, 10000, 2, 0.1);

// Linear/Fixed: always 1000ms
linearBackoff(1000);
fixedDelay(1000);

// Incremental: 100ms -> 200ms -> 300ms -> 400ms (max 10s)
incrementalBackoff(100, 100, 10000);
```

### Concurrency Control

Limit the number of concurrent async operations.

#### `pLimit(concurrency): LimitFunction`

```typescript
import { pLimit } from '@m16khb/async-utils';

const limit = pLimit(3); // Max 3 concurrent operations

// Basic usage
const results = await Promise.all([
  limit(() => fetchUser(1)),
  limit(() => fetchUser(2)),
  limit(() => fetchUser(3)),
  limit(() => fetchUser(4)), // Waits for a slot
  limit(() => fetchUser(5)),
]);

// With priority (higher = more urgent)
await limit(() => importantTask(), { priority: 10 });
await limit(() => normalTask(), { priority: 5 });

// With cancellation
const controller = new AbortController();
const task = limit(() => longTask(), { signal: controller.signal });
controller.abort(); // Cancels if still in queue

// Dynamic concurrency
limit.setConcurrency(10); // Increase limit
limit.clearQueue();       // Cancel all pending tasks

// Monitor state
console.log(limit.activeCount);  // Currently running
console.log(limit.pendingCount); // Waiting in queue
console.log(limit.getState());   // Full state object
```

##### LimitFunction Properties

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `activeCount` | `number` | Number of currently running tasks |
| `pendingCount` | `number` | Number of tasks waiting in queue |
| `setConcurrency(n)` | `(n: number) => void` | Change concurrency limit |
| `clearQueue()` | `() => void` | Cancel all pending tasks |
| `getState()` | `() => ConcurrencyState` | Get detailed state |

#### Helper Functions

```typescript
import { pLimitAll, pLimitSettled } from '@m16khb/async-utils';

// Execute all with concurrency limit
const results = await pLimitAll(
  [() => task1(), () => task2(), () => task3()],
  2 // concurrency
);

// Like Promise.allSettled with concurrency
const settled = await pLimitSettled(tasks, 2);
```

### Timeout

Add timeout behavior to any Promise.

#### `pTimeout<T>(promise, options): Promise<T>`

```typescript
import { pTimeout } from '@m16khb/async-utils';

// Basic timeout
try {
  const result = await pTimeout(slowOperation(), { milliseconds: 5000 });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Operation timed out');
  }
}

// With fallback value (no error thrown)
const result = await pTimeout(slowOperation(), {
  milliseconds: 5000,
  fallback: 'default value',
});

// Simple syntax
const result = await pTimeout(promise, 5000);
const result = await pTimeout(promise, 5000, 'fallback');

// Full options
const result = await pTimeout(promise, {
  milliseconds: 5000,
  fallback: 'default',
  signal: abortController.signal,
  cleanup: () => cancelOperation(),
  onTimeout: (reason) => console.log(reason),
  onSuccess: (result, duration) => console.log(`Took ${duration}ms`),
  onError: (error, duration) => console.log(`Failed after ${duration}ms`),
});
```

##### Options

| Option | Type | Description |
|--------|------|-------------|
| `milliseconds` | `number` | Timeout duration in milliseconds |
| `fallback` | `T` | Value to return on timeout (prevents error) |
| `signal` | `AbortSignal` | Cancellation signal |
| `cleanup` | `() => void \| Promise<void>` | Cleanup function on timeout/error |
| `onTimeout` | `(reason: string) => void` | Callback when timeout occurs |
| `onSuccess` | `(result, duration) => void` | Callback on success |
| `onError` | `(error, duration) => void` | Callback on failure |

#### Helper Functions

```typescript
import { pTimeoutAll, pTimeoutSettled } from '@m16khb/async-utils';

// Timeout all promises
const results = await pTimeoutAll([p1, p2, p3], 5000);

// Like Promise.allSettled with timeout
const settled = await pTimeoutSettled([p1, p2, p3], 5000);
```

### Delay

Safe, cancellable delay functions with memory leak prevention.

#### `wait(ms, options?): Promise<void>`

```typescript
import { wait } from '@m16khb/async-utils';

// Basic delay
await wait(1000); // Wait 1 second

// With return value
const result = await wait(1000, 'done'); // Returns 'done' after 1s

// With AbortSignal (cancellable)
const controller = new AbortController();
setTimeout(() => controller.abort(), 500);

try {
  await wait(1000, { signal: controller.signal });
} catch (error) {
  if (error instanceof AbortError) {
    console.log('Wait was cancelled');
  }
}

// With unref (won't prevent Node.js from exiting)
await wait(1000, { unref: true });
```

##### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `signal` | `AbortSignal` | - | Cancellation signal |
| `value` | `T` | - | Value to return after delay |
| `unref` | `boolean` | `false` | Don't prevent Node.js from exiting |

#### `waitUntil(condition, options?): Promise<void>`

Wait until a condition becomes true.

```typescript
import { waitUntil } from '@m16khb/async-utils';

// Wait for a condition
let ready = false;
setTimeout(() => ready = true, 1000);
await waitUntil(() => ready);

// With timeout
await waitUntil(() => isConnected(), { timeout: 5000 });

// With custom polling interval
await waitUntil(() => checkStatus(), { interval: 100 });

// With async condition
await waitUntil(async () => {
  const response = await fetch('/health');
  return response.ok;
});
```

##### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `interval` | `number` | `50` | Polling interval in milliseconds |
| `timeout` | `number` | - | Maximum wait time (throws on timeout) |
| `signal` | `AbortSignal` | - | Cancellation signal |

#### `waitFor(count, ms, callback?, options?): Promise<void>`

Execute callback multiple times with delay between each.

```typescript
import { waitFor } from '@m16khb/async-utils';

// Simple interval (5 times, 1 second apart)
await waitFor(5, 1000);

// With callback
await waitFor(5, 1000, (iteration) => {
  console.log(`Tick ${iteration}`); // 0, 1, 2, 3, 4
});

// Async callback
await waitFor(3, 500, async (i) => {
  await saveProgress(i);
});

// Cancellable
const controller = new AbortController();
await waitFor(10, 1000, console.log, { signal: controller.signal });
```

### Error Classes

```typescript
import { RetryError, TimeoutError, AbortError } from '@m16khb/async-utils';

try {
  await retry(failingOperation, { attempts: 3 });
} catch (error) {
  if (error instanceof RetryError) {
    console.log(`Failed after ${error.attempts} attempts`);
    console.log('Last error:', error.lastError);
    console.log('All errors:', error.errors);
  }
}

try {
  await pTimeout(slowOperation(), 1000);
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log(`Timed out after ${error.milliseconds}ms`);
  }
}

try {
  await pLimit(1)(() => task(), { signal: abortedSignal });
} catch (error) {
  if (error instanceof AbortError) {
    console.log('Operation was cancelled');
  }
}
```

### Abort Utilities

```typescript
import {
  checkAborted,
  throwIfAborted,
  createAbortableDelay,
  withAbortSignal,
} from '@m16khb/async-utils';

// Check if signal is aborted (throws AbortError)
checkAborted(signal);

// Alias for checkAborted
throwIfAborted(signal);

// Create a delay that can be cancelled
await createAbortableDelay(1000, signal);

// Wrap any promise to support cancellation
const result = await withAbortSignal(somePromise, signal);
```

## Advanced Usage

### Combining Utilities

```typescript
import { retry, pLimit, pTimeout } from '@m16khb/async-utils';

const limit = pLimit(5);

async function fetchWithRetry(url: string) {
  return retry(
    () => pTimeout(
      fetch(url).then(r => r.json()),
      { milliseconds: 10000 }
    ),
    { attempts: 3 }
  );
}

// Fetch multiple URLs with concurrency, timeout, and retry
const results = await Promise.all(
  urls.map(url => limit(() => fetchWithRetry(url)))
);
```

### Graceful Shutdown

```typescript
const controller = new AbortController();
const limit = pLimit(10);

process.on('SIGTERM', () => {
  controller.abort();
  limit.clearQueue();
});

// All operations respect the abort signal
const tasks = items.map(item =>
  limit(() => processItem(item), { signal: controller.signal })
);
```

## Modular Imports

Import only what you need for optimal tree-shaking:

```typescript
// Full import
import { retry, pLimit, pTimeout, wait } from '@m16khb/async-utils';

// Modular imports
import { retry, exponentialBackoff } from '@m16khb/async-utils/retry';
import { pLimit, pLimitAll } from '@m16khb/async-utils/concurrency';
import { pTimeout, pTimeoutAll } from '@m16khb/async-utils/timeout';
import { wait, waitUntil, waitFor } from '@m16khb/async-utils/core';
import { AbortError, RetryError, TimeoutError } from '@m16khb/async-utils/core';
```

## TypeScript

This package is written in TypeScript and includes comprehensive type definitions.

```typescript
import type {
  RetryOptions,
  RetryStrategy,
  RetryState,
  LimitFunction,
  LimitTaskOptions,
  ConcurrencyState,
  TimeoutOptions,
  WaitOptions,
} from '@m16khb/async-utils';
```

## Performance

- **Overhead**: < 1ms per operation
- **Memory**: No leaks with proper cleanup
- **Concurrency**: Tested with 1,000+ concurrent tasks
- **Timeout accuracy**: ±50ms

## Browser Support

This package is designed for Node.js. For browser usage, ensure your bundler handles ESM properly and that `AbortController` is available (all modern browsers support it).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE) © m16khb
