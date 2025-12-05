# Quickstart: @npm-library/async-utils

**목표**: 5분 안에 기본 기능을 사용해보기

## 설치

```bash
# npm
npm install @npm-library/async-utils

# pnpm
pnpm add @npm-library/async-utils

# yarn
yarn add @npm-library/async-utils
```

## 기본 사용법

### 1. Retry (재시도)

```typescript
import { retry, RetryError } from '@npm-library/async-utils';

// 기본 사용 (3회 재시도, 지수 백오프)
const data = await retry(() => fetch('/api/data'));

// 옵션 지정
const result = await retry(
  () => fetch('/api/data'),
  {
    maxAttempts: 5,           // 5회 재시도 (총 6회 시도)
    retryIf: (err) =>         // 특정 에러만 재시도
      err.message.includes('ECONNRESET'),
    onRetry: (err, attempt) => // 재시도 로깅
      console.log(`Retry ${attempt}: ${err.message}`),
  }
);

// 에러 처리
try {
  await retry(() => failingOperation());
} catch (err) {
  if (err instanceof RetryError) {
    console.log(`${err.attempts}번 시도 후 실패: ${err.cause}`);
  }
}
```

### 2. Timeout (타임아웃)

```typescript
import { pTimeout, TimeoutError } from '@npm-library/async-utils';

// 기본 사용
const data = await pTimeout(
  fetch('/api/slow-endpoint'),
  { milliseconds: 5000 }
);

// 폴백 값 사용
const result = await pTimeout(
  fetch('/api/data'),
  {
    milliseconds: 3000,
    fallback: { default: true }, // 타임아웃 시 이 값 반환
  }
);

// 에러 처리
try {
  await pTimeout(slowOperation(), { milliseconds: 1000 });
} catch (err) {
  if (err instanceof TimeoutError) {
    console.log('작업이 시간 초과되었습니다');
  }
}
```

### 3. Concurrency Limit (동시성 제한)

```typescript
import { pLimit } from '@npm-library/async-utils';

// 동시에 5개만 실행
const limit = pLimit(5);

// 100개 작업을 동시에 5개씩 처리
const urls = Array.from({ length: 100 }, (_, i) => `/api/item/${i}`);
const results = await Promise.all(
  urls.map(url => limit(() => fetch(url)))
);

// 우선순위 사용
const important = limit(
  () => fetch('/api/critical'),
  { priority: 10 }  // 높은 우선순위
);

const normal = limit(
  () => fetch('/api/normal'),
  { priority: 5 }   // 기본 우선순위
);

// 상태 확인
console.log(`실행 중: ${limit.activeCount}, 대기 중: ${limit.pendingCount}`);
```

### 4. 조합 사용

```typescript
import { retry, pTimeout, pLimit } from '@npm-library/async-utils';

const limit = pLimit(3);

async function fetchWithRetryAndTimeout(url: string) {
  return limit(() =>
    retry(
      () => pTimeout(
        fetch(url),
        { milliseconds: 5000 }
      ),
      { maxAttempts: 2 }
    )
  );
}

// 100개 URL을 동시에 3개씩, 각각 타임아웃 5초, 재시도 2회로 처리
const urls = getUrls();
const results = await Promise.all(
  urls.map(url => fetchWithRetryAndTimeout(url))
);
```

### 5. AbortSignal로 취소

```typescript
import { retry, pTimeout, AbortError } from '@npm-library/async-utils';

const controller = new AbortController();

// 3초 후 취소
setTimeout(() => controller.abort(), 3000);

try {
  await retry(
    () => fetch('/api/slow'),
    { signal: controller.signal }
  );
} catch (err) {
  if (err instanceof AbortError) {
    console.log('작업이 취소되었습니다');
  }
}
```

## NestJS 통합

### 모듈 설정

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AsyncUtilsModule } from '@npm-library/async-utils/nestjs';

@Module({
  imports: [
    AsyncUtilsModule.forRoot({
      retry: { maxAttempts: 3 },
      timeout: { milliseconds: 10000 },
    }),
  ],
})
export class AppModule {}
```

### ConfigService 연동

```typescript
// app.module.ts
import { AsyncUtilsModule } from '@npm-library/async-utils/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AsyncUtilsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        retry: {
          maxAttempts: config.get('RETRY_MAX_ATTEMPTS', 3),
        },
        timeout: {
          milliseconds: config.get('DEFAULT_TIMEOUT', 10000),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### 데코레이터 사용

```typescript
// external-api.service.ts
import { Injectable } from '@nestjs/common';
import { Retryable, Timeout, ConcurrencyLimit } from '@npm-library/async-utils/nestjs';

@Injectable()
export class ExternalApiService {
  @Retryable({ maxAttempts: 3, strategy: 'exponential' })
  @Timeout(5000)
  async fetchData(id: string): Promise<Data> {
    const response = await fetch(`/api/data/${id}`);
    return response.json();
  }

  @ConcurrencyLimit(5)
  async processBatch(items: Item[]): Promise<Result[]> {
    return Promise.all(items.map(item => this.processItem(item)));
  }
}
```

### 인터셉터 사용

```typescript
// app.controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { RetryInterceptor, TimeoutInterceptor } from '@npm-library/async-utils/nestjs';

@Controller()
@UseInterceptors(RetryInterceptor, TimeoutInterceptor)
export class AppController {
  @Get('data')
  async getData() {
    // 이 메서드는 자동으로 재시도와 타임아웃이 적용됩니다
    return this.externalService.fetchData();
  }
}
```

## 백오프 전략 커스터마이징

```typescript
import { retry, RetryStrategy } from '@npm-library/async-utils';

// 커스텀 전략 구현
class JitteredBackoff implements RetryStrategy {
  constructor(
    private baseDelay = 100,
    private maxDelay = 10000
  ) {}

  shouldRetry(_error: Error, attempt: number, maxAttempts: number): boolean {
    return attempt < maxAttempts;
  }

  getDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * delay * 0.3; // 30% 지터
    return Math.min(delay + jitter, this.maxDelay);
  }
}

// 사용
await retry(
  () => fetch('/api/data'),
  { strategy: new JitteredBackoff(200, 5000) }
);
```

## 타입 임포트

```typescript
// 타입만 필요한 경우
import type {
  RetryOptions,
  RetryStrategy,
  TimeoutOptions,
  LimitFunction,
  LimitTaskOptions,
} from '@npm-library/async-utils';

// 에러 클래스
import {
  RetryError,
  TimeoutError,
  AbortError,
} from '@npm-library/async-utils';

// 전략 클래스
import {
  ExponentialBackoff,
  LinearBackoff,
} from '@npm-library/async-utils';
```

## 다음 단계

- [API 레퍼런스](./contracts/async-utils-api.yaml) - 전체 API 문서
- [데이터 모델](./data-model.md) - 상세 타입 정의
- [README.md](../../packages/async-utils/README.md) - 전체 문서
