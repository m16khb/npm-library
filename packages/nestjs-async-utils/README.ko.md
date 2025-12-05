# @m16khb/nestjs-async-utils

[![npm version](https://img.shields.io/npm/v/@m16khb/nestjs-async-utils.svg)](https://www.npmjs.com/package/@m16khb/nestjs-async-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%20%7C%2011-red.svg)](https://nestjs.com/)

[English](https://github.com/m16khb/npm-library/blob/main/packages/nestjs-async-utils/README.md) | [한국어](#)

NestJS 비동기 작업 제어 라이브러리. `@Retryable`, `@Timeout`, `@ConcurrencyLimit` 데코레이터로 메서드에 재시도, 타임아웃, 동시성 제한 기능을 선언적으로 적용할 수 있습니다.

## 기능

- **@Retryable** - 메서드 실패 시 자동 재시도 (지수 백오프 지원)
- **@Timeout** - 메서드 실행 시간 제한
- **@ConcurrencyLimit** - 동일 메서드의 동시 실행 수 제한
- **데코레이터 조합** - 여러 데코레이터를 조합하여 사용 가능
- **전역 설정** - `forRoot()`/`forRootAsync()`로 기본값 설정
- **커스텀 로거** - LoggerService 또는 간단한 함수 로거 지원
- **Core 유틸리티** - Framework-agnostic `retry`, `pTimeout`, `pLimit` 함수 제공
- **Zero Dependencies** - NestJS와 rxjs만 peerDependency

## 설치

```bash
npm install @m16khb/nestjs-async-utils

# pnpm
pnpm add @m16khb/nestjs-async-utils
```

## 요구사항

- Node.js >= 20.0.0
- NestJS >= 10.0.0
- TypeScript >= 5.7

## 빠른 시작

### 1. 모듈 등록

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

### 2. 데코레이터 사용

```typescript
// payment.service.ts
import { Injectable } from '@nestjs/common';
import { Retryable, Timeout, ConcurrencyLimit } from '@m16khb/nestjs-async-utils/nestjs';

@Injectable()
export class PaymentService {
  @ConcurrencyLimit(5)       // 동시 5개까지만 실행
  @Retryable({ retries: 3 }) // 실패 시 3회 재시도
  @Timeout(5000)             // 각 시도당 5초 타임아웃
  async processPayment(orderId: string): Promise<PaymentResult> {
    return this.paymentGateway.charge(orderId);
  }
}
```

## NestJS 데코레이터

### @Retryable

메서드 실패 시 자동으로 재시도합니다.

```typescript
import { Retryable } from '@m16khb/nestjs-async-utils/nestjs';
import { exponentialBackoff } from '@m16khb/nestjs-async-utils/core';

@Injectable()
export class EmailService {
  // 기본 옵션 (3회 재시도)
  @Retryable()
  async sendEmail(to: string, subject: string): Promise<void> {
    return this.mailProvider.send({ to, subject });
  }

  // 커스텀 옵션
  @Retryable({
    retries: 5,
    strategy: exponentialBackoff(100, 5000),
    retryWhen: (error) => error.name !== 'ValidationError',
    enableLogging: true,
    onRetry: (attempt, error, delay) => {
      console.log(`재시도 ${attempt}: ${error.message}`);
    },
  })
  async sendBulkEmail(emails: string[]): Promise<void> {
    // ...
  }
}
```

#### 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `retries` | `number` | `3` | 최대 재시도 횟수 |
| `strategy` | `RetryStrategy` | `exponentialBackoff()` | 백오프 전략 함수 |
| `retryWhen` | `(error: Error) => boolean` | - | 재시도 조건 필터 |
| `retryOn` | `ErrorClass[]` | - | 특정 에러 클래스만 재시도 |
| `enableLogging` | `boolean` | `false` | 로깅 활성화 |
| `onRetry` | `(attempt, error, delay) => void` | - | 재시도 콜백 |

### @Timeout

메서드 실행 시간을 제한합니다.

```typescript
import { Timeout } from '@m16khb/nestjs-async-utils/nestjs';

@Injectable()
export class ReportService {
  // 간단한 사용
  @Timeout(10000)
  async generateReport(): Promise<Report> {
    return this.reportEngine.generate();
  }

  // 상세 옵션
  @Timeout({
    milliseconds: 30000,
    message: '리포트 생성 시간 초과',
    enableLogging: true,
    onTimeout: (methodName, timeout) => {
      console.log(`${methodName} ${timeout}ms 후 타임아웃`);
    },
  })
  async generateLargeReport(): Promise<Report> {
    // ...
  }
}
```

#### 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `milliseconds` | `number` | `30000` | 타임아웃 시간 (ms) |
| `message` | `string` | - | 타임아웃 에러 메시지 |
| `enableLogging` | `boolean` | `false` | 로깅 활성화 |
| `onTimeout` | `(methodName, timeout) => void` | - | 타임아웃 콜백 |

### @ConcurrencyLimit

동일 메서드의 동시 실행 수를 제한합니다.

```typescript
import { ConcurrencyLimit } from '@m16khb/nestjs-async-utils/nestjs';

@Injectable()
export class ExternalApiService {
  // 간단한 사용 - 최대 3개 동시 실행
  @ConcurrencyLimit(3)
  async fetchData(id: string): Promise<Data> {
    return this.httpService.get(`/api/data/${id}`);
  }

  // 대기열 타임아웃 설정
  @ConcurrencyLimit({
    limit: 5,
    queueTimeout: 10000, // 10초 내에 슬롯 미확보 시 에러
    enableLogging: true,
  })
  async processRequest(req: Request): Promise<Response> {
    // ...
  }
}
```

#### 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `limit` | `number` | `10` | 최대 동시 실행 수 |
| `queueTimeout` | `number` | - | 대기열 타임아웃 (ms) |
| `enableLogging` | `boolean` | `false` | 로깅 활성화 |

### 데코레이터 조합

여러 데코레이터를 조합할 때 실행 순서에 주의하세요:

```typescript
// 실행 순서: ConcurrencyLimit -> Retryable -> Timeout (아래에서 위로)
@ConcurrencyLimit(5)       // 3. 동시성 슬롯 확보
@Retryable({ retries: 3 }) // 2. 재시도 로직
@Timeout(5000)             // 1. 각 시도에 타임아웃 적용
async myMethod() {}
```

**실행 흐름:**
1. 동시성 슬롯 확보 대기
2. 슬롯 확보 후 실행 시작
3. 실패 시 재시도 (최대 3회)
4. 각 시도마다 5초 타임아웃 적용

## 모듈 설정

### forRoot (동기 설정)

```typescript
AsyncUtilsModule.forRoot({
  defaultRetries: 5,
  defaultTimeout: 10000,
  defaultConcurrency: 20,
  enableLogging: true,
})
```

### forRootAsync (비동기 설정)

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

### 커스텀 로거 설정

NestJS `LoggerService` 인터페이스를 구현한 커스텀 로거를 사용할 수 있습니다.

```typescript
import { ConsoleLogger } from '@nestjs/common';

// 커스텀 로거 구현
class CustomLogger extends ConsoleLogger {
  log(message: string, context?: string) {
    super.log(`[AsyncUtils] ${message}`, context);
  }
}

// 모듈 설정
AsyncUtilsModule.forRoot({
  logger: new CustomLogger(),
  enableLogging: true,
})
```

간단한 함수 로거도 사용할 수 있습니다:

```typescript
AsyncUtilsModule.forRoot({
  loggerFn: (message, context) => {
    console.log(`[${context}] ${message}`);
  },
  enableLogging: true,
})
```

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `logger` | `LoggerService` | NestJS Logger | 커스텀 로거 (LoggerService 구현체) |
| `loggerFn` | `(message, context) => void` | - | 간단한 함수 로거 (logger보다 우선) |

### 글로벌 모듈 설정

기본적으로 `AsyncUtilsModule`은 글로벌 모듈로 등록됩니다. 특정 모듈에서만 사용하려면 `isGlobal: false`를 설정하세요.

```typescript
// 기본: 글로벌 모듈 (전체 앱에서 사용 가능)
AsyncUtilsModule.forRoot()  // isGlobal: true (기본값)

// 특정 모듈에서만 사용
@Module({
  imports: [
    AsyncUtilsModule.forRoot({
      isGlobal: false, // 이 모듈에서만 사용
    }),
  ],
})
export class FeatureModule {}
```

`forRootAsync`에서도 동일하게 사용할 수 있습니다:

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

## 에러 처리

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
    console.log(`타임아웃: ${error.milliseconds}ms`);
  } else if (RetryError.isRetryError(error)) {
    console.log(`${error.attempts}회 시도 후 실패`);
  } else if (QueueTimeoutError.isQueueTimeoutError(error)) {
    console.log(`대기열 타임아웃: ${error.queueTimeout}ms`);
  }
}
```

## Core 유틸리티

Framework-agnostic 유틸리티도 직접 사용할 수 있습니다:

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

### 백오프 전략

```typescript
import {
  exponentialBackoff,
  exponentialBackoffWithJitter,
  linearBackoff,
  fixedDelay,
} from '@m16khb/nestjs-async-utils/core';

// 지수 백오프: 100ms -> 200ms -> 400ms (최대 10s)
exponentialBackoff(100, 10000, 2);

// 지터 포함 (thundering herd 방지)
exponentialBackoffWithJitter(100, 10000, 2, 0.1);

// 고정 지연
fixedDelay(1000);
```

## 모듈별 Import

Tree-shaking 최적화를 위해 필요한 것만 import하세요:

```typescript
// NestJS 데코레이터
import {
  AsyncUtilsModule,
  Retryable,
  Timeout,
  ConcurrencyLimit
} from '@m16khb/nestjs-async-utils/nestjs';

// Core 유틸리티
import { retry, pLimit, pTimeout } from '@m16khb/nestjs-async-utils/core';

// 개별 모듈
import { retry, exponentialBackoff } from '@m16khb/nestjs-async-utils/retry';
import { pLimit } from '@m16khb/nestjs-async-utils/concurrency';
import { pTimeout } from '@m16khb/nestjs-async-utils/timeout';
```

## TypeScript

```typescript
import type {
  // NestJS 타입
  AsyncUtilsModuleOptions,
  AsyncUtilsModuleAsyncOptions,
  RetryableOptions,
  TimeoutOptions,
  ConcurrencyLimitOptions,
  MethodConcurrencyState,
  // Core 타입
  RetryOptions,
  RetryStrategy,
  LimitFunction,
} from '@m16khb/nestjs-async-utils/nestjs';

// 서비스 import
import {
  AsyncUtilsLoggerService,
  ConcurrencyManagerService,
} from '@m16khb/nestjs-async-utils/nestjs';
```

## 성능

- **데코레이터 오버헤드**: < 1ms per call
- **동시성**: 1,000+ 동시 요청 정확한 제한
- **번들 크기**: < 1KB (gzipped, nestjs module)

## 라이선스

[MIT](LICENSE)
