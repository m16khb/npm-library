---
"@m16khb/nestjs-sidequest": minor
---

feat: @m16khb/nestjs-sidequest 패키지 최초 릴리스

NestJS를 위한 Sidequest.js 통합 래퍼 라이브러리입니다.

### 주요 기능

- **데이터베이스 기반 Job 큐**: Redis 없이 기존 데이터베이스(PostgreSQL, MySQL, SQLite, MongoDB)를 사용
- **NestJS 표준 패턴**: @Processor, @OnJob, @Retry 데코레이터 기반 API
- **유연한 설정**: forRoot/forRootAsync 모듈 등록 패턴
- **CLS 통합**: nestjs-cls를 통한 traceId 전파 지원 (optional)

### 데코레이터

- `@Processor(queueName)`: 클래스를 Job Processor로 지정
- `@OnJob(jobName)`: 메서드를 특정 Job 핸들러로 지정
- `@Retry(options)`: Job 재시도 정책 설정
- `@InjectQueue(queueName)`: Queue 인스턴스 주입
- `@OnJobComplete(jobName?)`: Job 완료 이벤트 핸들러
- `@OnJobFailed(jobName?)`: Job 실패 이벤트 핸들러

### 서비스

- `SidequestEngineService`: 엔진 라이프사이클 관리
- `QueueRegistryService`: 큐 등록 및 관리
- `ProcessorRegistryService`: 프로세서 등록 및 디스패치
- `ClsIntegrationService`: CLS context 통합

### 사용 예시

```typescript
// 모듈 등록
@Module({
  imports: [
    SidequestModule.forRoot({
      backend: {
        driver: '@sidequest/postgres-backend',
        config: process.env.DATABASE_URL,
      },
      queues: [{ name: 'email', concurrency: 5 }],
    }),
  ],
})
export class AppModule {}

// Processor 정의
@Processor('email')
export class EmailProcessor {
  @OnJob('SendWelcomeEmailJob')
  @Retry({ maxAttempts: 3, backoff: 'exponential' })
  async handleWelcomeEmail(data: any) {
    await this.mailer.send(data);
  }
}
```
