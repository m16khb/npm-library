# Quick Start: Async Utils Library

## Installation

```bash
npm install @org/async-utils
# or
pnpm add @org/async-utils
# or
yarn add @org/async-utils
```

## Basic Usage

### 1. Retry with Exponential Backoff

```typescript
import { retry } from '@org/async-utils';

// Simple retry (default: 3 attempts)
const result = await retry(async () => {
  const response = await fetch('https://api.example.com');
  if (!response.ok) throw new Error('API error');
  return response.json();
});

// Advanced configuration
const data = await retry(
  () => database.insert(record),
  {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 30000,
    randomize: true, // Add jitter
    shouldRetry: (error) => {
      // Only retry network errors
      return error.name === 'NetworkError';
    },
    onFailedAttempt: (error) => {
      console.log(`Attempt ${error.attemptNumber} failed: ${error.message}`);
    },
    signal: abortController.signal
  }
);
```

### 2. Timeout Protection

```typescript
import { timeout } from '@org/async-utils';

// Basic timeout
const result = await timeout(
  fetch('https://slow-api.com'),
  { milliseconds: 5000 }
);

// With fallback value
const data = await timeout(
  expensiveOperation(),
  {
    milliseconds: 3000,
    fallback: () => ({ cached: true, data: defaultData })
  }
);

// Custom error message
try {
  await timeout(longOperation(), {
    milliseconds: 1000,
    message: 'Operation took too long!'
  });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Timeout occurred');
  }
}
```

### 3. Concurrency Control

```typescript
import { createConcurrencyLimit } from '@org/async-utils';

// Limit concurrent operations to 3
const limit = createConcurrencyLimit(3);

const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
const promises = urls.map(url =>
  limit.limit(async () => {
    const response = await fetch(url);
    return response.json();
  })
);

const results = await Promise.all(promises);

// Monitor queue status
console.log(`Active: ${limit.activeCount()}`);
console.log(`Pending: ${limit.pendingCount()}`);
```

### 4. Rate Limiting

```typescript
import { createRateLimit } from '@org/async-utils';

// Limit to 10 requests per second
const rateLimit = createRateLimit({ interval: 1000, limit: 10 });

// Use with concurrency limit
const limit = createConcurrencyLimit(5);
const results = await Promise.all(
  items.map(item =>
    limit.limit(async () => {
      await rateLimit.acquire();
      return processItem(item);
    })
  )
);
```

### 5. Sleep and Delay

```typescript
import { sleep, rangeDelay } from '@org/async-utils';

// Sleep for 1 second
await sleep(1000);

// Sleep with cancellation
const controller = new AbortController();
setTimeout(() => controller.abort(), 500);
try {
  await sleep(1000, { signal: controller.signal });
} catch (error) {
  if (error instanceof AbortError) {
    console.log('Sleep was aborted');
  }
}

// Random delay between 1-3 seconds
await rangeDelay(1000, 3000);

// Sleep and return a value
const value = await sleep(1000, { value: 'ready' });
console.log(value); // 'ready'
```

### 6. Promise Utilities

```typescript
import { withResolvers, toResult } from '@org/async-utils';

// Create promise with external resolve/reject
const { promise, resolve, reject } = withResolvers<string>();

// Later...
resolve('success');

// Convert promise to result tuple
const [data, error] = await toResult(async () => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed');
  return response.json();
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Data:', data);
}
```

## Advanced Patterns

### Retry with Timeout

```typescript
import { retry, timeout } from '@org/async-utils';

const result = await retry(
  () => timeout(
    fetch(apiUrl),
    { milliseconds: 5000 }
  ),
  { retries: 3 }
);
```

### Cancellation Across Operations

```typescript
import {
  retry,
  timeout,
  sleep,
  createConcurrencyLimit,
  AbortError
} from '@org/async-utils';

const controller = new AbortController();

// All operations respect the same signal
const limit = createConcurrencyLimit(3);

try {
  await Promise.all([
    retry(
      () => timeout(fetch(url1), { ms: 5000 }),
      { signal: controller.signal }
    ),
    limit.limit(() =>
      timeout(fetch(url2), { ms: 3000 })
    ),
    sleep(1000, { signal: controller.signal })
  ]);
} catch (error) {
  if (error instanceof AbortError) {
    console.log('Operations were cancelled');
  }
}

// Cancel all operations
controller.abort();
```

### Custom Retry Strategy

```typescript
import { retry, RetryError } from '@org/async-utils';

const result = await retry(
  async () => {
    const response = await fetch(url);

    // Custom retry logic
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
      throw new RetryError(
        'Rate limited',
        1,
        2,
        new Error(`Retry after ${retryAfter}s`)
      );
    }

    return response.json();
  },
  {
    shouldRetry: (error) => {
      if (error instanceof RetryError) {
        // Use custom delay from error
        return true;
      }
      return error.name === 'NetworkError';
    }
  }
);
```

## Migration Guide

### From Promise.race Timeout

```typescript
// Old way
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout')), 5000);
});

try {
  const result = await Promise.race([apiCall(), timeoutPromise]);
} catch (error) {
  if (error.message === 'Timeout') {
    // Handle timeout
  }
}

// New way
import { timeout, TimeoutError } from '@org/async-utils';

try {
  const result = await timeout(apiCall(), { milliseconds: 5000 });
} catch (error) {
  if (error instanceof TimeoutError) {
    // Handle timeout
  }
}
```

## Tree Shaking

Import only what you need:

```typescript
// Good - tree-shakable
import { retry, sleep } from '@org/async-utils';

// Even better - individual imports
import retry from '@org/async-utils/retry';
import sleep from '@org/async-utils/sleep';
```