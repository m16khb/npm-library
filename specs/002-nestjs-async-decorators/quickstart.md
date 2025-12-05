# Quick Start: NestJS 비동기 유틸리티 데코레이터

**5분 안에 시작하기**

## 1. 설치

```bash
# pnpm
pnpm add @npm-library/async-utils

# npm
npm install @npm-library/async-utils
```

## 2. 모듈 등록

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AsyncUtilsModule } from '@npm-library/async-utils/nestjs';

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

## 3. 데코레이터 사용

```typescript
// payment.service.ts
import { Injectable } from '@nestjs/common';
import {
  Retryable,
  Timeout,
  ConcurrencyLimit,
} from '@npm-library/async-utils/nestjs';

@Injectable()
export class PaymentService {
  /**
   * 외부 결제 API 호출 - 재시도 + 타임아웃 + 동시성 제한 적용
   */
  @ConcurrencyLimit(5)      // 동시 5개까지만 실행
  @Retryable({ retries: 3 }) // 실패 시 3회 재시도
  @Timeout(5000)            // 각 시도당 5초 타임아웃
  async processPayment(orderId: string): Promise<PaymentResult> {
    return this.paymentGateway.charge(orderId);
  }
}
```

## 4. 개별 데코레이터 사용 예시

### 재시도만 필요한 경우

```typescript
import { Retryable } from '@npm-library/async-utils/nestjs';
import { exponentialBackoff } from '@npm-library/async-utils/core';

@Injectable()
export class EmailService {
  @Retryable({
    retries: 5,
    strategy: exponentialBackoff(100, 5000),
    retryWhen: (error) => error.name !== 'ValidationError',
  })
  async sendEmail(to: string, subject: string, body: string) {
    return this.mailProvider.send({ to, subject, body });
  }
}
```

### 타임아웃만 필요한 경우

```typescript
import { Timeout } from '@npm-library/async-utils/nestjs';

@Injectable()
export class ReportService {
  @Timeout(10000) // 10초 타임아웃
  async generateReport(params: ReportParams): Promise<Report> {
    return this.reportEngine.generate(params);
  }
}
```

### 동시성 제한만 필요한 경우

```typescript
import { ConcurrencyLimit } from '@npm-library/async-utils/nestjs';

@Injectable()
export class ExternalApiService {
  @ConcurrencyLimit({ limit: 3, queueTimeout: 30000 })
  async fetchData(id: string): Promise<Data> {
    return this.httpService.get(`/api/data/${id}`);
  }
}
```

## 5. 비동기 설정 (ConfigService 사용)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AsyncUtilsModule } from '@npm-library/async-utils/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AsyncUtilsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultRetries: config.get('ASYNC_RETRIES', 3),
        defaultTimeout: config.get('ASYNC_TIMEOUT', 30000),
        enableLogging: config.get('ASYNC_LOGGING', false),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## 6. 데코레이터 실행 순서

데코레이터를 조합할 때 아래에서 위로 실행됩니다:

```typescript
@ConcurrencyLimit(5)    // 3. 가장 바깥: 동시성 슬롯 확보
@Retryable({ retries: 3 }) // 2. 중간: 재시도 로직
@Timeout(5000)          // 1. 가장 안쪽: 각 시도에 타임아웃 적용
async myMethod() {}
```

**실행 흐름:**
1. 동시성 슬롯 확보 대기
2. 슬롯 확보 후 실행 시작
3. 실패 시 → 재시도 (최대 3회)
4. 각 시도마다 5초 타임아웃 적용

## 7. 에러 처리

```typescript
import {
  RetryError,
  TimeoutError,
  QueueTimeoutError,
} from '@npm-library/async-utils/nestjs';

try {
  await this.paymentService.processPayment(orderId);
} catch (error) {
  if (TimeoutError.isTimeoutError(error)) {
    // 타임아웃 발생
    console.log(`타임아웃: ${error.timeout}ms`);
  } else if (RetryError.isRetryError(error)) {
    // 모든 재시도 실패
    console.log(`${error.attempts}회 시도 후 실패`);
  } else if (QueueTimeoutError.isQueueTimeoutError(error)) {
    // 대기열 타임아웃
    console.log(`대기열 타임아웃: ${error.queueTimeout}ms`);
  }
}
```

## 다음 단계

- [전체 API 문서](./data-model.md) - 모든 옵션과 타입 정의
- [리서치 문서](./research.md) - 설계 결정 및 패턴
- [API 계약](./contracts/api-contract.ts) - TypeScript 인터페이스 정의
