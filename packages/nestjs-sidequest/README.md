# @m16khb/nestjs-sidequest

NestJS integration for [Sidequest.js](https://sidequestjs.com/) - Database-native background job processing without Redis.

## Features

- **Database-Native**: Use your existing database (PostgreSQL, MySQL, MongoDB, SQLite) instead of Redis
- **Transaction Consistency**: Atomic job creation with your business logic
- **NestJS Integration**: Full support for NestJS DI, decorators, and lifecycle hooks
- **Developer Experience**: Familiar API patterns similar to @nestjs/bullmq
- **Optional CLS Support**: Context propagation with nestjs-cls (optional)

## Requirements

- Node.js >= 22.6.0 (Sidequest.js requirement)
- NestJS 10.x or 11.x
- A supported database backend

## Installation

```bash
npm install @m16khb/nestjs-sidequest sidequest

# Choose your database backend
npm install @sidequest/postgres-backend  # PostgreSQL
npm install @sidequest/mysql-backend     # MySQL
npm install @sidequest/sqlite-backend    # SQLite
npm install @sidequest/mongo-backend     # MongoDB
```

## Quick Start

### 1. Module Registration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { SidequestModule } from '@m16khb/nestjs-sidequest';

@Module({
  imports: [
    SidequestModule.forRoot({
      backend: {
        driver: '@sidequest/postgres-backend',
        config: process.env.DATABASE_URL,
      },
      queues: [
        { name: 'email', concurrency: 5 },
        { name: 'report', concurrency: 2 },
      ],
    }),
  ],
})
export class AppModule {}
```

### 2. Define a Processor

```typescript
// email.processor.ts
import { Processor, OnJob, Retry, OnJobComplete, OnJobFailed } from '@m16khb/nestjs-sidequest';

@Processor('email')
export class EmailProcessor {
  constructor(private readonly mailer: MailerService) {}

  @OnJob('SendWelcomeEmail')
  @Retry({ maxAttempts: 3, backoff: 'exponential' })
  async handleWelcomeEmail(data: { to: string; name: string }) {
    await this.mailer.send({
      to: data.to,
      subject: `Welcome, ${data.name}!`,
      template: 'welcome',
    });
    return { sentAt: new Date() };
  }

  @OnJobComplete('SendWelcomeEmail')
  async onComplete(event: JobCompleteEvent) {
    console.log(`Email sent: ${event.result.sentAt}`);
  }

  @OnJobFailed('SendWelcomeEmail')
  async onFailed(event: JobFailedEvent) {
    console.error(`Email failed: ${event.error.message}`);
  }
}
```

### 3. Inject Queue and Add Jobs

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue, IQueueService } from '@m16khb/nestjs-sidequest';

@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email') private emailQueue: IQueueService,
  ) {}

  async createUser(email: string, name: string) {
    // Create user...

    // Queue welcome email
    await this.emailQueue.add(SendWelcomeEmailJob, { to: email, name });
  }

  async sendScheduledEmail(email: string, sendAt: Date) {
    await this.emailQueue.addScheduled(SendWelcomeEmailJob, sendAt, { to: email });
  }
}
```

## API Reference

### Module

#### `SidequestModule.forRoot(options)`

Synchronous module configuration.

```typescript
interface SidequestModuleOptions {
  isGlobal?: boolean;              // Default: true
  backend: BackendConfig;          // Database backend configuration
  queues?: QueueConfig[];          // Queue configurations
  maxConcurrentJobs?: number;      // Global max concurrent jobs
  dashboard?: DashboardConfig;     // Dashboard configuration
  gracefulShutdown?: GracefulShutdownConfig;
  enableCls?: boolean;             // Enable nestjs-cls integration
}
```

#### `SidequestModule.forRootAsync(options)`

Asynchronous module configuration (supports `useFactory`, `useClass`, `useExisting`).

```typescript
SidequestModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    backend: {
      driver: '@sidequest/postgres-backend',
      config: config.get('DATABASE_URL'),
    },
  }),
  inject: [ConfigService],
});
```

### Decorators

| Decorator | Description |
|-----------|-------------|
| `@Processor(queueName, options?)` | Marks a class as a job processor for the specified queue |
| `@OnJob(jobName, options?)` | Marks a method as a handler for the specified job type |
| `@Retry(options)` | Configures retry policy for a job handler |
| `@InjectQueue(queueName)` | Injects a queue service instance |
| `@OnJobComplete(jobName?)` | Handler called when a job completes successfully |
| `@OnJobFailed(jobName?)` | Handler called when a job fails |

### Queue Service

```typescript
interface IQueueService {
  name: string;
  add<T>(JobClass: new (...args) => T, ...args): Promise<string>;
  addWithOptions<T>(JobClass, options: JobAddOptions, ...args): Promise<string>;
  addScheduled<T>(JobClass, scheduledAt: Date, ...args): Promise<string>;
  addBulk<T>(jobs: Array<{ JobClass; args; options? }>): Promise<string[]>;
}
```

## Why Sidequest.js?

| Feature | BullMQ + Redis | Sidequest.js |
|---------|----------------|--------------|
| Infrastructure | Requires Redis | Uses existing DB |
| Transaction Support | Separate compensation | Native DB transactions |
| Operational Cost (SMB) | Additional Redis cost | No additional cost |

## License

MIT
