# @m16khb/nestjs-async-utils

[![npm version](https://img.shields.io/npm/v/@m16khb/nestjs-async-utils.svg)](https://www.npmjs.com/package/@m16khb/nestjs-async-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%20%7C%2011-red.svg)](https://nestjs.com/)

[English](#) | [한국어](https://github.com/m16khb/npm-library/blob/main/packages/nestjs-async-utils/README.ko.md)

NestJS async operation control library. Apply retry, timeout, and concurrency limiting to methods declaratively using `@Retryable`, `@Timeout`, and `@ConcurrencyLimit` decorators.

## Features

- **@Retryable** - Automatic retry on method failure (with exponential backoff)
- **@Timeout** - Limit method execution time
- **@ConcurrencyLimit** - Limit concurrent executions of the same method
- **Decorator Composition** - Combine multiple decorators
- **Global Configuration** - Set defaults via `forRoot()`/`forRootAsync()`
- **Custom Logger** - Support for custom LoggerService or simple function logger
- **Core Utilities** - Framework-agnostic `retry`, `pTimeout`, `pLimit` functions
- **Zero Dependencies** - Only NestJS and rxjs as peerDependencies

## Installation

```bash
npm install @m16khb/nestjs-async-utils

# pnpm
pnpm add @m16khb/nestjs-async-utils
```

## Requirements

- Node.js >= 20.0.0
- NestJS >= 10.0.0
- TypeScript >= 5.7

## Quick Start

### 1. Register Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AsyncUtilsModule } from '@m16khb/nestjs-async-utils/nestjs';

@Module({
  imports: [
    AsyncUtilsModule.forRoot({
      defaultRetries: 3,
      defaultTimeout: 30000,
      defaultConcurrency: 10,
      enableLogging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class AppModule {}
```

### 2. Use Decorators

```typescript
// payment.service.ts
import { Injectable } from '@nestjs/common';
import { Retryable, Timeout, ConcurrencyLimit } from '@m16khb/nestjs-async-utils/nestjs';

@Injectable()
export class PaymentService {
  @ConcurrencyLimit(5)       // Max 5 concurrent executions
  @Retryable({ retries: 3 }) // Retry up to 3 times on failure
  @Timeout(5000)             // 5 second timeout per attempt
  async processPayment(orderId: string): Promise<PaymentResult> {
    return this.paymentGateway.charge(orderId);
  }
}
```

## NestJS Decorators

### @Retryable

Automatically retries on method failure.

```typescript
import { Retryable } from '@m16khb/nestjs-async-utils/nestjs';
import { exponentialBackoff } from '@m16khb/nestjs-async-utils/core';

@Injectable()
export class EmailService {
  // Default options (3 retries)
  @Retryable()
  async sendEmail(to: string, subject: string): Promise<void> {
    return this.mailProvider.send({ to, subject });
  }

  // Custom options
  @Retryable({
    retries: 5,
    strategy: exponentialBackoff(100, 5000),
    retryWhen: (error) => error.name !== 'ValidationError',
    enableLogging: true,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    },
  })
  async sendBulkEmail(emails: string[]): Promise<void> {
    // ...
  }
}
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retries` | `number` | `3` | Maximum retry attempts |
| `strategy` | `RetryStrategy` | `exponentialBackoff()` | Backoff strategy function |
| `retryWhen` | `(error: Error) => boolean` | - | Retry condition filter |
| `retryOn` | `ErrorClass[]` | - | Retry only on specific error classes |
| `enableLogging` | `boolean` | `false` | Enable logging |
| `onRetry` | `(attempt, error, delay) => void` | - | Retry callback |

### @Timeout

Limits method execution time.

```typescript
import { Timeout } from '@m16khb/nestjs-async-utils/nestjs';

@Injectable()
export class ReportService {
  // Simple usage
  @Timeout(10000)
  async generateReport(): Promise<Report> {
    return this.reportEngine.generate();
  }

  // Detailed options
  @Timeout({
    milliseconds: 30000,
    message: 'Report generation timed out',
    enableLogging: true,
    onTimeout: (methodName, timeout) => {
      console.log(`${methodName} timed out after ${timeout}ms`);
    },
  })
  async generateLargeReport(): Promise<Report> {
    // ...
  }
}
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `milliseconds` | `number` | `30000` | Timeout duration (ms) |
| `message` | `string` | - | Timeout error message |
| `enableLogging` | `boolean` | `false` | Enable logging |
| `onTimeout` | `(methodName, timeout) => void` | - | Timeout callback |

### @ConcurrencyLimit

Limits concurrent executions of the same method.

```typescript
import { ConcurrencyLimit } from '@m16khb/nestjs-async-utils/nestjs';

@Injectable()
export class ExternalApiService {
  // Simple usage - max 3 concurrent executions
  @ConcurrencyLimit(3)
  async fetchData(id: string): Promise<Data> {
    return this.httpService.get(`/api/data/${id}`);
  }

  // With queue timeout
  @ConcurrencyLimit({
    limit: 5,
    queueTimeout: 10000, // Error if slot not acquired within 10s
    enableLogging: true,
  })
  async processRequest(req: Request): Promise<Response> {
    // ...
  }
}
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `10` | Maximum concurrent executions |
| `queueTimeout` | `number` | - | Queue timeout (ms) |
| `enableLogging` | `boolean` | `false` | Enable logging |

### Decorator Composition

Note the execution order when combining decorators:

```typescript
// Execution order: ConcurrencyLimit -> Retryable -> Timeout (bottom to top)
@ConcurrencyLimit(5)       // 3. Acquire concurrency slot
@Retryable({ retries: 3 }) // 2. Retry logic
@Timeout(5000)             // 1. Apply timeout to each attempt
async myMethod() {}
```

**Execution flow:**
1. Wait for concurrency slot
2. Start execution after acquiring slot
3. Retry on failure (up to 3 times)
4. Apply 5 second timeout to each attempt

## Module Configuration

### forRoot (Synchronous)

```typescript
AsyncUtilsModule.forRoot({
  defaultRetries: 5,
  defaultTimeout: 10000,
  defaultConcurrency: 20,
  enableLogging: true,
})
```

### forRootAsync (Asynchronous)

```typescript
AsyncUtilsModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    defaultRetries: config.get('ASYNC_RETRIES', 3),
    defaultTimeout: config.get('ASYNC_TIMEOUT', 30000),
    enableLogging: config.get('ASYNC_LOGGING', false),
  }),
  inject: [ConfigService],
})
```

### Custom Logger

You can use a custom logger that implements the NestJS `LoggerService` interface.

```typescript
import { ConsoleLogger } from '@nestjs/common';

// Custom logger implementation
class CustomLogger extends ConsoleLogger {
  log(message: string, context?: string) {
    super.log(`[AsyncUtils] ${message}`, context);
  }
}

// Module configuration
AsyncUtilsModule.forRoot({
  logger: new CustomLogger(),
  enableLogging: true,
})
```

You can also use a simple function logger:

```typescript
AsyncUtilsModule.forRoot({
  loggerFn: (message, context) => {
    console.log(`[${context}] ${message}`);
  },
  enableLogging: true,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logger` | `LoggerService` | NestJS Logger | Custom logger (LoggerService implementation) |
| `loggerFn` | `(message, context) => void` | - | Simple function logger (takes precedence over logger) |

### Global Module Configuration

By default, `AsyncUtilsModule` is registered as a global module. Set `isGlobal: false` to use it only in specific modules.

```typescript
// Default: Global module (available throughout the app)
AsyncUtilsModule.forRoot()  // isGlobal: true (default)

// Use only in specific module
@Module({
  imports: [
    AsyncUtilsModule.forRoot({
      isGlobal: false, // Only available in this module
    }),
  ],
})
export class FeatureModule {}
```

Works the same with `forRootAsync`:

```typescript
AsyncUtilsModule.forRootAsync({
  isGlobal: false,
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    defaultTimeout: config.get('ASYNC_TIMEOUT'),
  }),
  inject: [ConfigService],
})
```

## Error Handling

```typescript
import {
  RetryError,
  TimeoutError,
  QueueTimeoutError,
} from '@m16khb/nestjs-async-utils/nestjs';

try {
  await this.paymentService.processPayment(orderId);
} catch (error) {
  if (TimeoutError.isTimeoutError(error)) {
    console.log(`Timeout: ${error.milliseconds}ms`);
  } else if (RetryError.isRetryError(error)) {
    console.log(`Failed after ${error.attempts} attempts`);
  } else if (QueueTimeoutError.isQueueTimeoutError(error)) {
    console.log(`Queue timeout: ${error.queueTimeout}ms`);
  }
}
```

## Core Utilities

Framework-agnostic utilities can be used directly:

```typescript
import { retry, pLimit, pTimeout, wait } from '@m16khb/nestjs-async-utils/core';

// Retry
const data = await retry(
  () => fetch('https://api.example.com/data').then(r => r.json()),
  { attempts: 3 }
);

// Concurrency limit
const limit = pLimit(5);
const results = await Promise.all(
  urls.map(url => limit(() => fetch(url)))
);

// Timeout
const result = await pTimeout(longRunningOperation(), { milliseconds: 5000 });

// Delay
await wait(1000);
```

### Backoff Strategies

```typescript
import {
  exponentialBackoff,
  exponentialBackoffWithJitter,
  linearBackoff,
  fixedDelay,
} from '@m16khb/nestjs-async-utils/core';

// Exponential: 100ms -> 200ms -> 400ms (max 10s)
exponentialBackoff(100, 10000, 2);

// With jitter (prevents thundering herd)
exponentialBackoffWithJitter(100, 10000, 2, 0.1);

// Fixed delay
fixedDelay(1000);
```

## Modular Imports

Import only what you need for tree-shaking optimization:

```typescript
// NestJS decorators
import {
  AsyncUtilsModule,
  Retryable,
  Timeout,
  ConcurrencyLimit
} from '@m16khb/nestjs-async-utils/nestjs';

// Core utilities
import { retry, pLimit, pTimeout } from '@m16khb/nestjs-async-utils/core';

// Specific modules
import { retry, exponentialBackoff } from '@m16khb/nestjs-async-utils/retry';
import { pLimit } from '@m16khb/nestjs-async-utils/concurrency';
import { pTimeout } from '@m16khb/nestjs-async-utils/timeout';
```

## TypeScript

```typescript
import type {
  // NestJS types
  AsyncUtilsModuleOptions,
  AsyncUtilsModuleAsyncOptions,
  RetryableOptions,
  TimeoutOptions,
  ConcurrencyLimitOptions,
  MethodConcurrencyState,
  // Core types
  RetryOptions,
  RetryStrategy,
  LimitFunction,
} from '@m16khb/nestjs-async-utils/nestjs';

// Service imports
import {
  AsyncUtilsLoggerService,
  ConcurrencyManagerService,
} from '@m16khb/nestjs-async-utils/nestjs';
```

## Performance

- **Decorator overhead**: < 1ms per call
- **Concurrency**: Accurate limiting with 1,000+ concurrent requests
- **Bundle size**: < 1KB (gzipped, nestjs module)

## License

[MIT](LICENSE)
