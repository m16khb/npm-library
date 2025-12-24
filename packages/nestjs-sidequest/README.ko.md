# @m16khb/nestjs-sidequest

[![npm version](https://img.shields.io/npm/v/@m16khb/nestjs-sidequest.svg)](https://www.npmjs.com/package/@m16khb/nestjs-sidequest)
[![License: LGPL v3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%20%7C%2011-red.svg)](https://nestjs.com/)

[English](https://github.com/m16khb/npm-library/blob/main/packages/nestjs-sidequest/README.md) | [한국어](#)

**[Sidequest.js](https://sidequestjs.com/)용 NestJS 통합 라이브러리** - Redis 없이 데이터베이스 기반 백그라운드 Job 처리.

기존 데이터베이스(PostgreSQL, MySQL, MongoDB, SQLite)를 활용해 백그라운드 Job을 처리하세요. NestJS 데코레이터와 선택적 CLS 통합을 완벽 지원합니다.

## 특징

- **데이터베이스 네이티브 Job** - Redis 대신 기존 데이터베이스 사용
- **트랜잭션 일관성** - 데이터베이스 트랜잭션 내에서 원자적 Job 생성
- **데코레이터 기반 API** - 익숙한 `@Processor`, `@OnJob`, `@Retry` 데코레이터
- **선택적 CLS 지원** - nestjs-cls로 컨텍스트 전파
- **이벤트 핸들러** - Job 생명주기 이벤트용 `@OnJobComplete`, `@OnJobFailed`
- **다중 큐 지원** - 개별 동시성 설정으로 여러 큐 구성
- **대시보드** - Job 모니터링을 위한 내장 UI (선택 사항)

## 설치

```bash
npm install @m16khb/nestjs-sidequest sidequest

# 데이터베이스 백엔드 선택
npm install @sidequest/postgres-backend  # PostgreSQL
npm install @sidequest/mysql-backend     # MySQL
npm install @sidequest/sqlite-backend    # SQLite
npm install @sidequest/mongo-backend     # MongoDB
```

### 선택적 의존성

```bash
# CLS 컨텍스트 전파를 위해
pnpm add nestjs-cls
```

## 요구사항

- Node.js >= 22.6.0
- NestJS >= 10.0.0
- TypeScript >= 5.7
- 지원되는 데이터베이스 백엔드

## 빠른 시작

### 1. 모듈 등록

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

### 2. Job 클래스 정의 (Sidequest.js 패턴)

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

### 3. Processor 생성

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
      subject: `${job.name}님, 환영합니다!`,
      template: 'welcome',
    });
    return { sentAt: new Date() };
  }

  @OnJobComplete(SendWelcomeEmailJob)
  async onComplete(event: JobCompleteEvent) {
    console.log(`이메일 발송 완료: ${event.result.sentAt}`);
  }

  @OnJobFailed(SendWelcomeEmailJob)
  async onFailed(event: JobFailedEvent) {
    console.error(`이메일 발송 실패: ${event.error.message}`);
  }
}
```

### 4. Queue 주입 및 Job 추가

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
    // 데이터베이스에 사용자 생성...
    const user = await this.userRepository.save({ email, name });

    // 환영 이메일 큐에 추가 (백그라운드 실행)
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

## 모듈 설정

### forRoot (동기)

```typescript
SidequestModule.forRoot({
  // 모듈
  isGlobal: true,  // 기본값: true

  // 데이터베이스 백엔드
  backend: {
    driver: '@sidequest/postgres-backend',
    config: process.env.DATABASE_URL,
  },

  // 큐
  queues: [
    {
      name: 'email',
      concurrency: 5,      // 최대 동시 Job 수
      priority: 50,        // 기본 우선순위 (높을수록 우선)
      state: 'active',     // 'active' | 'paused'
    },
  ],

  // 엔진 설정
  maxConcurrentJobs: 10,           // 전체 최대 동시성
  minThreads: 4,                   // 최소 워커 스레드 (기본값: CPU 코어 수)
  maxThreads: 8,                   // 최대 워커 스레드 (기본값: minThreads * 2)
  jobPollingInterval: 100,         // Job 폴링 간격 (ms)
  releaseStaleJobsIntervalMin: 60, // 오래된 Job 해제 간격 (분)
  cleanupFinishedJobsIntervalMin: 60, // 완료된 Job 정리 간격 (분)

  // 로거
  logger: {
    level: 'info',
    json: false,  // 프로덕션용 JSON 출력
  },

  // 대시보드 (선택 사항)
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
    timeout: 30000,  // 30초
  },

  // CLS 통합 (선택 사항)
  enableCls: true,  // nestjs-cls 필요
})
```

### forRootAsync (비동기)

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

## 데코레이터

### @Processor(queueName, options?)

클래스를 지정된 큐의 Job 프로세서로 표시합니다.

```typescript
@Processor('email', { concurrency: 10 })
export class EmailProcessor {}
```

### @OnJob(JobClass, options?)

메서드를 지정된 Job 타입의 핸들러로 표시합니다.

```typescript
@OnJob(SendEmailJob, { timeout: 30000 })
async handleEmail(job: SendEmailJob) {
  // ...
}
```

### @Retry(options)

Job 핸들러의 재시도 정책을 설정합니다.

```typescript
@Retry({
  maxAttempts: 3,
  backoff: {
    type: 'exponential',  // 'exponential' | 'fixed'
    delay: 1000,         // 초기 지연 시간 (ms)
    multiplier: 2,       // 지수 승수
  },
  retryOn: ['NetworkError', 'TimeoutError'],  // 이 에러들만 재시도
})
async handleJob(job: AnyJob) {
  // ...
}
```

### @InjectQueue(queueName)

큐 서비스 인스턴스를 주입합니다.

```typescript
constructor(@InjectQueue('email') private emailQueue: IQueueService) {}
```

### @OnJobComplete(JobClass?)

Job이 성공적으로 완료되었을 때 호출되는 핸들러입니다.

```typescript
@OnJobComplete(SendEmailJob)
async onComplete(event: JobCompleteEvent) {
  console.log(`Job ${event.jobId} 완료:`, event.result);
}
```

### @OnJobFailed(JobClass?)

Job이 실패했을 때 호출되는 핸들러입니다.

```typescript
@OnJobFailed(SendEmailJob)
async onFailed(event: JobFailedEvent) {
  console.error(`Job ${event.jobId} 실패:`, event.error);
}
```

## 큐 서비스 API

```typescript
interface IQueueService {
  readonly name: string;

  // 단일 Job 추가
  add<T>(JobClass: new (...args: unknown[]) => T, ...args: Parameters<T['constructor']>): Promise<string>;

  // 옵션과 함께 Job 추가
  addWithOptions<T>(
    JobClass: new (...args: unknown[]) => T,
    options: JobAddOptions,
    ...args: Parameters<T['constructor']>
  ): Promise<string>;

  // 예약된 Job 추가
  addScheduled<T>(
    JobClass: new (...args: unknown[]) => T,
    scheduledAt: Date,
    ...args: Parameters<T['constructor']>
  ): Promise<string>;

  // 여러 Job 추가 (벌크)
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
  chunkSize?: number;  // 청크당 Job 수 (기본값: 100)
}
```

### JobAddOptions

```typescript
interface JobAddOptions {
  // 참고: Sidequest.js는 현재 개별 Job 레벨 priority를 지원하지 않습니다.
  // 대신 큐 레벨 priority 설정을 사용하세요.
  priority?: number;       // @deprecated - 큐 레벨 priority 사용
  timeout?: number;        // Job 타임아웃 (ms) - Sidequest.js에 전달됨
  maxAttempts?: number;    // 재시도 횟수 재정의
  startAfter?: Date;       // 지연된 시작 (scheduledAt)
}
```

### 벌크 Job 예제

```typescript
// 기본 청킹(100개)으로 여러 Job 추가
const jobs = users.map(user => ({
  JobClass: SendWelcomeEmailJob,
  args: [user.email, user.name] as const,
}));

await this.emailQueue.addBulk(jobs);

// 사용자 정의 청크 크기로 여러 Job 추가
await this.emailQueue.addBulk(jobs, { chunkSize: 50 });
```

### Priority 지원

**중요:** Sidequest.js는 **큐 레벨에서만** Job priority를 지원합니다. 개별 Job priority는 현재 지원되지 않습니다.

```typescript
SidequestModule.forRoot({
  queues: [
    { name: 'critical', concurrency: 5, priority: 100 },  // 최고 우선순위
    { name: 'default', concurrency: 10, priority: 50 },   // 중간 우선순위
    { name: 'bulk', concurrency: 2, priority: 10 },       // 최저 우선순위
  ],
})

// 'critical' 큐의 Job이 'default'와 'bulk' 큐보다 먼저 처리됩니다.
// 개별 Job priority 옵션은 현재 무시됩니다.
```

## CLS 통합

CLS 통합을 활성화하여 Job 실행 간 컨텍스트(traceId, userId 등)를 전파하세요:

```typescript
// app.module.ts
SidequestModule.forRoot({
  // ...
  enableCls: true,  // nestjs-cls 필요
})

// 컨텍스트가 자동으로 전파됨
@Processor('email')
export class EmailProcessor {
  constructor(private readonly cls: ClsService) {}

  @OnJob(SendEmailJob)
  async handleEmail(job: SendEmailJob) {
    const traceId = this.cls.getId();
    const userId = this.cls.get('userId');

    console.log(`[${traceId}] 사용자 ${userId}의 Job 처리 중`);
  }
}
```

## 핵심 강점

### ✅ 경합 조건 방지 (SKIP LOCKED)

Sidequest.js는 PostgreSQL의 `FOR UPDATE SKIP LOCKED`를 사용하여 다중 워커 환경에서 Job 중복 처리를 방지합니다:

```sql
SELECT * FROM sidequest_jobs
WHERE state = 'waiting' AND queue = 'email'
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

이로써 여러 워커가 동시에 Job을 처리하려 해도 각 Job은 정확히 한 번만 처리됩니다.

### ✅ 트랜잭션 내 원자적 Job 생성

Redis 기반 솔루션과 달리, 데이터베이스 트랜잭션 내에서 Job을 생성하여 일관성을 보장합니다:

```typescript
await this.dataSource.transaction(async (manager) => {
  // 사용자 생성
  const user = await manager.save(User, { email, name });

  // 환영 이메일 큐에 추가 - 트랜잭션 실패 시 함께 롤백!
  await this.emailQueue.add(SendWelcomeEmailJob, user.email, user.name);
});
```

트랜잭션이 실패하면 Job도 생성되지 않습니다. 보상 트랜잭션이 필요 없습니다.

## 아키텍처 고려사항

### ⚠️ NestJS DI 분리

Sidequest.js는 `fork()`를 통해 Job 워커를 **별도 프로세스**에서 실행합니다. 이는 다음을 의미합니다:

- Job 클래스(`extends Job`)에서 **`@Inject()` 데코레이터 사용 불가**
- Job 클래스 내부에서 NestJS DI 컨테이너 접근 불가
- 전체 DI 지원을 위해 `@Processor` 패턴과 `@OnJob` 핸들러 사용

```typescript
// ❌ 작동 안 함 - Job은 별도 프로세스에서 실행
export class SendEmailJob extends Job {
  @Inject() mailer: MailerService;  // undefined!
}

// ✅ 작동함 - Processor는 NestJS 컨텍스트에서 실행
@Processor('email')
export class EmailProcessor {
  constructor(private readonly mailer: MailerService) {}  // DI 작동!

  @OnJob(SendEmailJob)
  async handle(job: SendEmailJob) {
    await this.mailer.send(job.to, job.subject);
  }
}
```

### ⚠️ Sidequest.js 코어 제한사항

일부 기능은 Sidequest.js 코어 라이브러리에서 제어됩니다:

| 기능 | 상태 | 우회 방안 |
|---------|--------|------------|
| 개별 Job priority | ❌ 미지원 | 큐 레벨 priority 사용 |
| Job 타임아웃 취소 | ⚠️ fire-and-forget | 타임아웃 시그널 후에도 Job 계속 실행 |
| PostgreSQL NOTIFY | ❌ 폴링만 가능 | `jobPollingInterval` 증가로 부하 감소 |
| 적응형 폴링 | ❌ 고정 간격 | `jobPollingInterval`로 설정 |

## 권장 사용 사례

### ✅ 적합한 경우

- 내부 툴 및 어드민 시스템
- 중저 트래픽 서비스 (시간당 수천 건 이하)
- Redis 인프라 도입이 어려운 환경
- DB 트랜잭션과 Job 생성의 원자성이 필요한 경우

### ⚠️ 대안 고려

미션 크리티컬한 대규모 서비스의 경우, 검증된 솔루션인 **BullMQ + Redis**를 고려하세요.

## 왜 Sidequest.js인가요?

| 기능 | BullMQ + Redis | Sidequest.js |
|---------|----------------|--------------|
| 인프라 | 추가 Redis 서버 필요 | 기존 데이터베이스 사용 |
| 트랜잭션 지원 | 보상 트랜잭션 필요 | 네이티브 DB 트랜잭션 지원 |
| 운영 비용 | 추가 Redis 인스턴스 비용 | 추가 인프라 불필요 |
| 배포 단순성 | Redis 클러스터 관리 | 간단한 데이터베이스 연결 |
| 경합 조건 처리 | 분산 락 필요 | SKIP LOCKED 내장 |

## 라이선스

**LGPL v3** - 이 라이브러리는 GNU Lesser General Public License v3.0 하에 라이선스됩니다.

의미:
- 상용 소프트웨어에서 이 라이브러리를 사용해도 소스코드를 공개할 의무가 없습니다
- 이 라이브러리 자체를 수정한 경우 수정본은 LGPL/GPL로 공개해야 합니다
- 라이선스 attribution을 제공하고 사용자가 라이브러리를 교체할 수 있도록 해야 합니다
- 동적 링킹을 권장합니다

전체 라이선스 텍스트는 [LICENSE](LICENSE)를 참고하세요.

---

이 패키지는 LGPL v3로 라이선스된 [Sidequest.js](https://sidequestjs.com/)를 통합합니다.
