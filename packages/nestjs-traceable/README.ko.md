# @m16khb/nestjs-traceable

[![npm version](https://img.shields.io/npm/v/@m16khb/nestjs-traceable.svg)](https://www.npmjs.com/package/@m16khb/nestjs-traceable)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%20%7C%2011-red.svg)](https://nestjs.com/)

[English](https://github.com/m16khb/npm-library/blob/main/packages/nestjs-traceable/README.md) | [한국어](#)

NestJS 애플리케이션을 위한 **traceId 기반 분산 추적 라이브러리**입니다.

다양한 통신 채널(HTTP, gRPC, Kafka, Cron, BullMQ)을 통한 요청을 단일 traceId로 연결하여 분산 시스템의 디버깅과 모니터링을 단순화합니다.

## 주요 기능

- **traceId 자동 전파**: HTTP, gRPC, Kafka, BullMQ 간 traceId 연속성 유지
- **Winston 통합 로거**: 모든 로그에 traceId 자동 주입
- **추상 클래스 패턴**: 보일러플레이트 코드 제거
- **제로 설정**: 기본 설정만으로 즉시 사용 가능
- **TypeScript 완벽 지원**: 타입 안전성 보장

## 설치

```bash
# npm
npm install @m16khb/nestjs-traceable nestjs-cls

# yarn
yarn add @m16khb/nestjs-traceable nestjs-cls

# pnpm
pnpm add @m16khb/nestjs-traceable nestjs-cls
```

### 선택적 의존성

사용하는 기능에 따라 추가 패키지를 설치하세요:

```bash
# Winston 로거 (권장)
pnpm add nest-winston winston dayjs

# BullMQ Job 추적
pnpm add @nestjs/bullmq bullmq

# Cron Job 추적
pnpm add @nestjs/schedule
```

## 빠른 시작

### 1. 기본 설정

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TraceModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    TraceModule.forRoot({
      headerName: 'X-Trace-Id', // 기본값
    }),
  ],
})
export class AppModule {}
```

### 2. 서비스에서 traceId 사용

```typescript
// payment.service.ts
import { Injectable } from '@nestjs/common';
import { TraceContextService } from '@m16khb/nestjs-traceable';

@Injectable()
export class PaymentService {
  constructor(private readonly traceContext: TraceContextService) {}

  async processPayment(orderId: string): Promise<void> {
    const traceId = this.traceContext.getTraceId();
    console.log(`[${traceId}] Processing payment for order ${orderId}`);
    // ...
  }
}
```

### 3. Winston 로거 설정 (권장)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TraceModule, TraceableLoggerModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    TraceModule.forRoot(),
    TraceableLoggerModule.forRoot({
      level: 'info',
      isLocal: process.env.NODE_ENV !== 'production',
      appName: 'MyApp',
      traceIdLength: 8, // traceId 표시 길이 (0: 전체)
    }),
  ],
})
export class AppModule {}
```

```typescript
// payment.service.ts
import { Injectable } from '@nestjs/common';
import { TraceableLogger } from '@m16khb/nestjs-traceable';

@Injectable()
export class PaymentService {
  private readonly logger: TraceableLogger;

  constructor(logger: TraceableLogger) {
    this.logger = logger.setContext('PaymentService');
  }

  async processPayment(orderId: string): Promise<void> {
    this.logger.log('결제 처리 시작', { orderId });
    // 출력: [MyApp] 12345 - 12/06/2025, 12:30:45 AM LOG [PaymentService] [abc12345] 결제 처리 시작

    try {
      await this.doPayment();
      this.logger.log('결제 완료', { orderId, amount: 10000 });
    } catch (error) {
      this.logger.error('결제 실패', error);
    }
  }
}
```

## 통합 패턴

### HTTP 요청 추적

기본 설정만으로 HTTP 요청의 traceId가 자동 처리됩니다:

- `X-Trace-Id` 헤더가 있으면 해당 값 사용
- 없으면 UUID v4로 새 traceId 생성
- 응답 헤더에 traceId 포함

### BullMQ Job 추적

```typescript
// payment.processor.ts
import { Processor } from '@nestjs/bullmq';
import { TraceableProcessor, TraceableJobData, TraceableLogger } from '@m16khb/nestjs-traceable';
import { ClsService } from 'nestjs-cls';
import { Job } from 'bullmq';

interface PaymentJobData extends TraceableJobData {
  orderId: string;
  amount: number;
}

@Processor('payment')
export class PaymentProcessor extends TraceableProcessor<PaymentJobData, void> {
  constructor(
    cls: ClsService,
    private readonly paymentService: PaymentService,
    private readonly logger: TraceableLogger,
  ) {
    super(cls);
  }

  protected async executeJob(job: Job<PaymentJobData>): Promise<void> {
    // traceId가 이미 CLS에 설정됨!
    this.logger.log(`결제 처리: ${job.data.orderId}`);
    await this.paymentService.process(job.data);
  }
}
```

```typescript
// payment-queue.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TraceableQueueService } from '@m16khb/nestjs-traceable';
import { ClsService } from 'nestjs-cls';

interface PaymentJobData {
  orderId: string;
  amount: number;
}

@Injectable()
export class PaymentQueueService extends TraceableQueueService<PaymentJobData> {
  constructor(
    @InjectQueue('payment') queue: Queue,
    cls: ClsService,
  ) {
    super(queue, cls);
  }

  async addPaymentJob(orderId: string, amount: number): Promise<string> {
    // traceId가 자동으로 job.data에 포함됨
    return this.addJob('process', { orderId, amount });
  }
}
```

### Cron Job 추적

```typescript
// report.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TraceableCronService, TraceableLogger } from '@m16khb/nestjs-traceable';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class ReportCronService extends TraceableCronService {
  constructor(
    cls: ClsService,
    private readonly reportService: ReportService,
    private readonly logger: TraceableLogger,
  ) {
    super(cls);
  }

  @Cron('0 0 * * *', { name: 'daily-report', timeZone: 'Asia/Seoul' })
  async generateDailyReport(): Promise<void> {
    await this.runWithTrace(async () => {
      this.logger.log('[크론] 일일 리포트 생성 시작');
      await this.reportService.generate();
    });
  }
}
```

### gRPC 서비스 추적

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TraceModule, TraceGrpcInterceptor } from '@m16khb/nestjs-traceable';

@Module({
  imports: [TraceModule.forRoot()],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TraceGrpcInterceptor },
  ],
})
export class AppModule {}
```

### Kafka 이벤트 추적

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TraceModule, TraceKafkaInterceptor } from '@m16khb/nestjs-traceable';

@Module({
  imports: [TraceModule.forRoot()],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TraceKafkaInterceptor },
  ],
})
export class AppModule {}
```

Producer에서 traceId 전달:

```typescript
import { createKafkaTraceHeaders } from '@m16khb/nestjs-traceable';

await this.kafkaClient.emit('topic', {
  key: 'key',
  value: JSON.stringify(data),
  headers: createKafkaTraceHeaders(traceId),
});
```

### 사용자 정의 컨텍스트 값 저장

traceId와 함께 요청 범위 데이터(userId, requestIp 등)를 저장할 수 있습니다:

```typescript
// auth.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { TraceContextService } from '@m16khb/nestjs-traceable';

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly traceContext: TraceContextService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    // 사용자 컨텍스트 저장
    this.traceContext.set('userId', request.user?.id);
    this.traceContext.set('requestIp', request.ip);
    this.traceContext.set('userAgent', request.headers['user-agent']);

    return next.handle();
  }
}
```

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { TraceContextService } from '@m16khb/nestjs-traceable';

@Injectable()
export class OrderService {
  constructor(private readonly traceContext: TraceContextService) {}

  async createOrder(orderData: OrderDto) {
    const traceId = this.traceContext.getTraceId();
    const userId = this.traceContext.get<string>('userId');
    const requestIp = this.traceContext.get<string>('requestIp');

    console.log({
      traceId,
      userId,
      requestIp,
      action: 'create_order',
    });

    // 주문 생성 로직...
  }
}
```

## API Reference

### TraceModule

| 메서드 | 설명 |
|--------|------|
| `forRoot(options?)` | 기본 모듈 설정 |
| `forRootAsync(options)` | 비동기 모듈 설정 (ConfigService 등) |
| `register(options?)` | forRoot의 별칭 |

### TraceModuleOptions

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `headerName` | string | `'X-Trace-Id'` | traceId 헤더명 |

### TraceContextService

#### TraceId 관리

| 메서드 | 반환 타입 | 설명 |
|--------|----------|------|
| `getTraceId()` | `string \| undefined` | 현재 traceId 조회 |
| `setTraceId(traceId)` | `void` | traceId 설정 |
| `generateTraceId()` | `string` | 새 traceId 생성 및 설정 |
| `hasContext()` | `boolean` | traceId 존재 여부 |
| `isActive()` | `boolean` | CLS 활성화 여부 |
| `run(fn, traceId?)` | `T` | 새 컨텍스트에서 동기 함수 실행 |
| `runAsync(fn, traceId?)` | `Promise<T>` | 새 컨텍스트에서 비동기 함수 실행 |

#### 사용자 정의 컨텍스트 값

| 메서드 | 반환 타입 | 설명 |
|--------|----------|------|
| `set<T>(key, value)` | `void` | CLS에 사용자 정의 값 저장 |
| `get<T>(key)` | `T \| undefined` | CLS에서 값 조회 |
| `has(key)` | `boolean` | 키 존재 여부 확인 |
| `delete(key)` | `void` | CLS에서 값 삭제 |

### TraceableLogger

| 메서드 | 레벨 | 설명 |
|--------|------|------|
| `log(message, meta?)` | info | 일반 정보 로그 |
| `error(message, errorOrMeta?)` | error | 에러 로그 |
| `warn(message, meta?)` | warn | 경고 로그 |
| `debug(message, meta?)` | debug | 디버그 로그 |
| `verbose(message, meta?)` | verbose | 상세 로그 |
| `query(message, meta?)` | query | SQL 쿼리 로그 |
| `slowQuery(message, durationMs, meta?)` | warn | 느린 쿼리 경고 |
| `fatal(message, errorOrMeta?)` | error | 치명적 오류 |
| `setContext(context)` | `TraceableLogger` | 컨텍스트 설정 |

### TraceableLoggerModuleOptions

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `level` | LogLevel | `'info'` | 최소 로그 레벨 |
| `isLocal` | boolean | `NODE_ENV !== 'production'` | Pretty/JSON 출력 전환 |
| `appName` | string | `'Nest'` | 로그 프리픽스 |
| `traceIdLength` | number | `8` | traceId 표시 길이 |
| `timestampFormat` | `() => string` | dayjs 기반 | 타임스탬프 포맷 |

## 출력 형식

### 로컬 환경 (Pretty)

```
[MyApp] 12345 - 12/06/2025, 12:30:45 AM LOG     [PaymentService] [abc12345] 결제 처리 시작
```

### 프로덕션 환경 (JSON)

```json
{"timestamp":"2025-12-06T00:30:45.123+0900","level":"info","context":"PaymentService","traceId":"abc12345-def6-7890","message":"결제 처리 시작"}
```

## 요구사항

- Node.js 20+
- NestJS 10.x / 11.x
- TypeScript 5.7+

## 의존성

### 필수 (peerDependencies)

| 패키지 | 버전 |
|--------|------|
| `@nestjs/common` | ^10.0.0 \|\| ^11.0.0 |
| `@nestjs/core` | ^10.0.0 \|\| ^11.0.0 |
| `nestjs-cls` | ^4.0.0 \|\| ^5.0.0 |
| `rxjs` | ^7.0.0 |

### 선택적 (peerDependencies)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@nestjs/bullmq` | ^10.0.0 \|\| ^11.0.0 | BullMQ 지원 |
| `bullmq` | ^5.0.0 | BullMQ Worker |
| `@nestjs/schedule` | ^4.0.0 \|\| ^5.0.0 | Cron 지원 |
| `nest-winston` | ^1.9.0 \|\| ^2.0.0 | Winston 통합 |
| `winston` | ^3.0.0 | 로깅 |
| `dayjs` | ^1.11.0 | 타임스탬프 |

## 라이선스

[MIT](LICENSE)
