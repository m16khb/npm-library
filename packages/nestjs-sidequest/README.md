# @m16khb/nestjs-sidequest

[![npm version](https://img.shields.io/npm/v/@m16khb/nestjs-sidequest.svg)](https://www.npmjs.com/package/@m16khb/nestjs-sidequest)
[![License: LGPL v3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%20%7C%2011-red.svg)](https://nestjs.com/)

[English](#) | [한국어](https://github.com/m16khb/npm-library/blob/main/packages/nestjs-sidequest/README.ko.md)

**NestJS integration for [Sidequest.js](https://sidequestjs.com/)** - Database-native background job processing without Redis.

Process background jobs using your existing database (PostgreSQL, MySQL, MongoDB, SQLite) with full NestJS decorator support and optional CLS integration.

## Features

- **Database-Native Jobs** - Use your existing database instead of Redis
- **Transaction Consistency** - Atomic job creation within database transactions
- **Decorator-Based API** - Familiar `@Processor`, `@OnJob`, `@Retry` decorators
- **Optional CLS Support** - Context propagation with nestjs-cls
- **Event Handlers** - `@OnJobComplete`, `@OnJobFailed` for job lifecycle events
- **Multiple Queue Support** - Configure queues with individual concurrency settings
- **Dashboard** - Built-in UI for monitoring jobs (optional)

## Installation

```bash
npm install @m16khb/nestjs-sidequest sidequest

# Choose your database backend
npm install @sidequest/postgres-backend  # PostgreSQL
npm install @sidequest/mysql-backend     # MySQL
npm install @sidequest/sqlite-backend    # SQLite
npm install @sidequest/mongo-backend     # MongoDB
```

### Optional Dependencies

```bash
# For CLS context propagation
pnpm add nestjs-cls
```

## Requirements

- Node.js >= 22.6.0
- NestJS >= 10.0.0
- TypeScript >= 5.7
- A supported database backend

## Quick Start

### 1. Register Module

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
        { name: 'reports', concurrency: 2 },
      ],
    }),
  ],
})
export class AppModule {}
```

### 2. Define a Job Class (Sidequest.js Pattern)

```typescript
// jobs/send-welcome-email.job.ts
import { Job } from 'sidequest';

export class SendWelcomeEmailJob extends Job {
  constructor(
    public readonly to: string,
    public readonly name: string,
  ) {
    super();
  }
}
```

### 3. Create a Processor

```typescript
// email.processor.ts
import { Processor, OnJob, Retry, OnJobComplete, OnJobFailed } from '@m16khb/nestjs-sidequest';
import { SendWelcomeEmailJob } from './jobs/send-welcome-email.job';

@Processor('email')
export class EmailProcessor {
  constructor(private readonly mailer: MailerService) {}

  @OnJob(SendWelcomeEmailJob)
  @Retry({ maxAttempts: 3, backoff: { type: 'exponential', delay: 1000 } })
  async handleWelcomeEmail(job: SendWelcomeEmailJob) {
    await this.mailer.send({
      to: job.to,
      subject: `Welcome, ${job.name}!`,
      template: 'welcome',
    });
    return { sentAt: new Date() };
  }

  @OnJobComplete(SendWelcomeEmailJob)
  async onComplete(event: JobCompleteEvent) {
    console.log(`Email sent at: ${event.result.sentAt}`);
  }

  @OnJobFailed(SendWelcomeEmailJob)
  async onFailed(event: JobFailedEvent) {
    console.error(`Email failed: ${event.error.message}`);
  }
}
```

### 4. Inject Queue and Add Jobs

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue, IQueueService } from '@m16khb/nestjs-sidequest';
import { SendWelcomeEmailJob } from './jobs/send-welcome-email.job';

@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email') private emailQueue: IQueueService,
  ) {}

  async createUser(email: string, name: string) {
    // Create user in database...
    const user = await this.userRepository.save({ email, name });

    // Queue welcome email (runs in background)
    await this.emailQueue.add(SendWelcomeEmailJob, email, name);
  }

  async scheduleWelcomeEmail(email: string, name: string, sendAt: Date) {
    await this.emailQueue.addScheduled(
      SendWelcomeEmailJob,
      sendAt,
      email,
      name
    );
  }
}
```

## Module Configuration

### forRoot (Synchronous)

```typescript
SidequestModule.forRoot({
  // Module
  isGlobal: true,  // Default: true

  // Database Backend
  backend: {
    driver: '@sidequest/postgres-backend',
    config: process.env.DATABASE_URL,
  },

  // Queues
  queues: [
    {
      name: 'email',
      concurrency: 5,      // Max concurrent jobs
      priority: 50,        // Default priority (higher = first)
      state: 'active',     // 'active' | 'paused'
    },
  ],

  // Engine Settings
  maxConcurrentJobs: 10,           // Global max concurrency
  minThreads: 4,                   // Min worker threads (default: CPU cores)
  maxThreads: 8,                   // Max worker threads (default: minThreads * 2)
  jobPollingInterval: 100,         // Job polling interval (ms)
  releaseStaleJobsIntervalMin: 60, // Stale job release interval (minutes)
  cleanupFinishedJobsIntervalMin: 60, // Finished job cleanup interval (minutes)

  // Logger
  logger: {
    level: 'info',
    json: false,  // JSON output for production
  },

  // Dashboard (Optional)
  dashboard: {
    enabled: true,
    port: 8678,
    path: '/',
    auth: {
      user: 'admin',
      password: 'password',
    },
  },

  // Graceful Shutdown
  gracefulShutdown: {
    enabled: true,
    timeout: 30000,  // 30 seconds
  },

  // CLS Integration (Optional)
  enableCls: true,  // Requires nestjs-cls to be installed
})
```

### forRootAsync (Asynchronous)

```typescript
SidequestModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    backend: {
      driver: '@sidequest/postgres-backend',
      config: config.get('DATABASE_URL'),
    },
    queues: [
      { name: 'email', concurrency: config.get('EMAIL_CONCURRENCY', 5) },
    ],
    enableCls: config.get('ENABLE_CLS', false),
  }),
  inject: [ConfigService],
})
```

## Decorators

### @Processor(queueName, options?)

Marks a class as a job processor for the specified queue.

```typescript
@Processor('email', { concurrency: 10 })
export class EmailProcessor {}
```

### @OnJob(JobClass, options?)

Marks a method as a handler for the specified job type.

```typescript
@OnJob(SendEmailJob, { timeout: 30000 })
async handleEmail(job: SendEmailJob) {
  // ...
}
```

### @Retry(options)

Configures retry policy for a job handler.

```typescript
@Retry({
  maxAttempts: 3,
  backoff: {
    type: 'exponential',  // 'exponential' | 'fixed'
    delay: 1000,         // Initial delay in ms
    multiplier: 2,       // Exponential multiplier
  },
  retryOn: ['NetworkError', 'TimeoutError'],  // Retry only on these errors
})
async handleJob(job: AnyJob) {
  // ...
}
```

### @InjectQueue(queueName)

Injects a queue service instance.

```typescript
constructor(@InjectQueue('email') private emailQueue: IQueueService) {}
```

### @OnJobComplete(JobClass?)

Handler called when a job completes successfully.

```typescript
@OnJobComplete(SendEmailJob)
async onComplete(event: JobCompleteEvent) {
  console.log(`Job ${event.jobId} completed:`, event.result);
}
```

### @OnJobFailed(JobClass?)

Handler called when a job fails.

```typescript
@OnJobFailed(SendEmailJob)
async onFailed(event: JobFailedEvent) {
  console.error(`Job ${event.jobId} failed:`, event.error);
}
```

## Queue Service API

```typescript
interface IQueueService {
  readonly name: string;

  // Add a single job
  add<T>(JobClass: new (...args: unknown[]) => T, ...args: Parameters<T['constructor']>): Promise<string>;

  // Add a job with options
  addWithOptions<T>(
    JobClass: new (...args: unknown[]) => T,
    options: JobAddOptions,
    ...args: Parameters<T['constructor']>
  ): Promise<string>;

  // Add a scheduled job
  addScheduled<T>(
    JobClass: new (...args: unknown[]) => T,
    scheduledAt: Date,
    ...args: Parameters<T['constructor']>
  ): Promise<string>;

  // Add multiple jobs (bulk)
  addBulk<T>(jobs: Array<{
    JobClass: new (...args: unknown[]) => T;
    args: Parameters<T['constructor']>;
    options?: JobAddOptions;
  }>, options?: BulkJobOptions): Promise<string[]>;
}
```

### BulkJobOptions

```typescript
interface BulkJobOptions {
  chunkSize?: number;  // Jobs per chunk (default: 100)
}
```

### JobAddOptions

```typescript
interface JobAddOptions {
  // Note: Individual job priority is not currently supported by Sidequest.js.
  // Use queue-level priority configuration instead.
  priority?: number;       // @deprecated - Use queue-level priority
  timeout?: number;        // Job timeout in ms (passed to Sidequest.js)
  maxAttempts?: number;    // Override retry attempts
  startAfter?: Date;       // Delayed start (scheduledAt)
}
```

### Bulk Job Example

```typescript
// Add multiple jobs with default chunking (100 jobs per chunk)
const jobs = users.map(user => ({
  JobClass: SendWelcomeEmailJob,
  args: [user.email, user.name] as const,
}));

await this.emailQueue.addBulk(jobs);

// Add multiple jobs with custom chunk size
await this.emailQueue.addBulk(jobs, { chunkSize: 50 });
```

### Priority Support

**Important:** Sidequest.js supports job priority at the **queue level only**. Individual job priority is not currently supported.

```typescript
SidequestModule.forRoot({
  queues: [
    { name: 'critical', concurrency: 5, priority: 100 },  // Highest priority
    { name: 'default', concurrency: 10, priority: 50 },   // Medium priority
    { name: 'bulk', concurrency: 2, priority: 10 },       // Lowest priority
  ],
})

// Jobs in 'critical' queue will be processed before 'default' and 'bulk' queues.
// Individual job priority options are currently ignored.
```

## CLS Integration

Enable CLS integration to propagate context (traceId, userId, etc.) across job executions:

```typescript
// app.module.ts
SidequestModule.forRoot({
  // ...
  enableCls: true,  // Requires nestjs-cls
})

// Context is automatically propagated
@Processor('email')
export class EmailProcessor {
  constructor(private readonly cls: ClsService) {}

  @OnJob(SendEmailJob)
  async handleEmail(job: SendEmailJob) {
    const traceId = this.cls.getId();
    const userId = this.cls.get('userId');

    console.log(`[${traceId}] Processing job for user ${userId}`);
  }
}
```

## Why Sidequest.js?

| Feature | BullMQ + Redis | Sidequest.js |
|---------|----------------|--------------|
| Infrastructure | Additional Redis server | Uses existing database |
| Transaction Support | Requires compensation transactions | Native DB transaction support |
| Operational Cost | Extra Redis instance cost | No additional infrastructure |
| Deployment Simplicity | Manage Redis cluster | Simple database connection |

## License

**LGPL v3** - This library is licensed under the GNU Lesser General Public License v3.0.

This means:
- You may use this library in proprietary software without opening your source code
- If you modify this library itself, modifications must be released under LGPL/GPL
- You must provide license attribution and allow users to replace the library
- Dynamic linking is recommended for compliance

For full license text, see [LICENSE](LICENSE).

---

This package integrates [Sidequest.js](https://sidequestjs.com/), which is also licensed under LGPL v3.
