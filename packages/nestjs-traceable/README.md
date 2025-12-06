# @m16khb/nestjs-traceable

[![npm version](https://img.shields.io/npm/v/@m16khb/nestjs-traceable.svg)](https://www.npmjs.com/package/@m16khb/nestjs-traceable)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%20%7C%2011-red.svg)](https://nestjs.com/)

[English](#) | [한국어](https://github.com/m16khb/npm-library/blob/main/packages/nestjs-traceable/README.ko.md)

**TraceId-based distributed tracing library for NestJS applications**.

Simplifies debugging and monitoring in distributed systems by connecting requests across various communication channels (HTTP, gRPC, Kafka, Cron, BullMQ) with a single traceId.

## Features

- **Automatic traceId Propagation**: Maintains traceId continuity across HTTP, gRPC, Kafka, and BullMQ
- **Winston Logger Integration**: Automatically injects traceId into all logs
- **Abstract Class Pattern**: Eliminates boilerplate code
- **Zero Configuration**: Ready to use with minimal setup
- **Full TypeScript Support**: Type-safe implementation

## Installation

```bash
# npm
npm install @m16khb/nestjs-traceable nestjs-cls

# yarn
yarn add @m16khb/nestjs-traceable nestjs-cls

# pnpm
pnpm add @m16khb/nestjs-traceable nestjs-cls
```

### Optional Dependencies

Install additional packages based on the features you need:

```bash
# Winston logger (recommended)
pnpm add nest-winston winston dayjs

# BullMQ job tracking
pnpm add @nestjs/bullmq bullmq

# Cron job tracking
pnpm add @nestjs/schedule
```

## Quick Start

### 1. Basic Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TraceModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    TraceModule.forRoot({
      headerName: 'X-Trace-Id', // default value
    }),
  ],
})
export class AppModule {}
```

### 2. Using traceId in Services

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

### 3. Winston Logger Setup (Recommended)

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
      traceIdLength: 8, // traceId display length (0: full)
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
    this.logger.log('Payment processing started', { orderId });
    // Output: [MyApp] 12345 - 12/06/2025, 12:30:45 AM LOG [PaymentService] [abc12345] Payment processing started

    try {
      await this.doPayment();
      this.logger.log('Payment completed', { orderId, amount: 10000 });
    } catch (error) {
      this.logger.error('Payment failed', error);
    }
  }
}
```

## Integration Patterns

### HTTP Request Tracking

TraceId is automatically handled for HTTP requests with minimal setup:

- Uses `X-Trace-Id` header value if present
- Generates new UUID v4 traceId if not present
- Includes traceId in response headers

### BullMQ Job Tracking

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
    // traceId is already set in CLS!
    this.logger.log(`Processing payment: ${job.data.orderId}`);
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
    // traceId is automatically included in job.data
    return this.addJob('process', { orderId, amount });
  }
}
```

### Cron Job Tracking

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
      this.logger.log('[Cron] Starting daily report generation');
      await this.reportService.generate();
    });
  }
}
```

### gRPC Service Tracking

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

### Kafka Event Tracking

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

Passing traceId from producer:

```typescript
import { createKafkaTraceHeaders } from '@m16khb/nestjs-traceable';

await this.kafkaClient.emit('topic', {
  key: 'key',
  value: JSON.stringify(data),
  headers: createKafkaTraceHeaders(traceId),
});
```

### Storing Custom Context Values

Store any request-scoped data (userId, requestIp, etc.) alongside traceId:

```typescript
// auth.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { TraceContextService } from '@m16khb/nestjs-traceable';

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly traceContext: TraceContextService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    // Store user context
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

    // Order creation logic...
  }
}
```

## API Reference

### TraceModule

| Method | Description |
|--------|-------------|
| `forRoot(options?)` | Basic module configuration |
| `forRootAsync(options)` | Async module configuration (for ConfigService, etc.) |
| `register(options?)` | Alias for forRoot |

### TraceModuleOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headerName` | string | `'X-Trace-Id'` | traceId header name |

### TraceContextService

#### TraceId Management

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getTraceId()` | `string \| undefined` | Get current traceId |
| `setTraceId(traceId)` | `void` | Set traceId |
| `generateTraceId()` | `string` | Generate and set new traceId |
| `hasContext()` | `boolean` | Check if traceId exists |
| `isActive()` | `boolean` | Check if CLS is active |
| `run(fn, traceId?)` | `T` | Run sync function in new context |
| `runAsync(fn, traceId?)` | `Promise<T>` | Run async function in new context |

#### Custom Context Values

| Method | Return Type | Description |
|--------|-------------|-------------|
| `set<T>(key, value)` | `void` | Store custom value in CLS |
| `get<T>(key)` | `T \| undefined` | Retrieve custom value from CLS |
| `has(key)` | `boolean` | Check if key exists |
| `delete(key)` | `void` | Delete value from CLS |

### TraceableLogger

| Method | Level | Description |
|--------|-------|-------------|
| `log(message, meta?)` | info | General information log |
| `error(message, errorOrMeta?)` | error | Error log |
| `warn(message, meta?)` | warn | Warning log |
| `debug(message, meta?)` | debug | Debug log |
| `verbose(message, meta?)` | verbose | Verbose log |
| `query(message, meta?)` | query | SQL query log |
| `slowQuery(message, durationMs, meta?)` | warn | Slow query warning |
| `fatal(message, errorOrMeta?)` | error | Fatal error |
| `setContext(context)` | `TraceableLogger` | Set context |

### TraceableLoggerModuleOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | LogLevel | `'info'` | Minimum log level |
| `isLocal` | boolean | `NODE_ENV !== 'production'` | Toggle Pretty/JSON output |
| `appName` | string | `'Nest'` | Log prefix |
| `traceIdLength` | number | `8` | traceId display length |
| `timestampFormat` | `() => string` | dayjs-based | Timestamp format |

## Output Formats

### Local (Pretty)

```
[MyApp] 12345 - 12/06/2025, 12:30:45 AM LOG     [PaymentService] [abc12345] Payment processing started
```

### Production (JSON)

```json
{"timestamp":"2025-12-06T00:30:45.123+0900","level":"info","context":"PaymentService","traceId":"abc12345-def6-7890","message":"Payment processing started"}
```

## Requirements

- Node.js 20+
- NestJS 10.x / 11.x
- TypeScript 5.7+

## Dependencies

### Required (peerDependencies)

| Package | Version |
|---------|---------|
| `@nestjs/common` | ^10.0.0 \|\| ^11.0.0 |
| `@nestjs/core` | ^10.0.0 \|\| ^11.0.0 |
| `nestjs-cls` | ^4.0.0 \|\| ^5.0.0 |
| `rxjs` | ^7.0.0 |

### Optional (peerDependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/bullmq` | ^10.0.0 \|\| ^11.0.0 | BullMQ support |
| `bullmq` | ^5.0.0 | BullMQ Worker |
| `@nestjs/schedule` | ^4.0.0 \|\| ^5.0.0 | Cron support |
| `nest-winston` | ^1.9.0 \|\| ^2.0.0 | Winston integration |
| `winston` | ^3.0.0 | Logging |
| `dayjs` | ^1.11.0 | Timestamps |

## License

[MIT](LICENSE)
