# Quickstart: NestJS Traceable

5분 내에 NestJS 애플리케이션에 분산 추적을 적용하는 가이드.

## Installation

```bash
npm install @m16khb/nestjs-traceable
# or
pnpm add @m16khb/nestjs-traceable
# or
yarn add @m16khb/nestjs-traceable
```

## Basic Setup

### 1. 모듈 등록

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TraceModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    TraceModule.forRoot(),
    // ... other modules
  ],
})
export class AppModule {}
```

이것만으로 모든 HTTP 요청에 traceId가 자동으로 생성/전파됩니다.

### 2. HTTP 요청 추적 확인

요청을 보내면 응답 헤더에 `X-Trace-Id`가 포함됩니다:

```bash
curl -i http://localhost:3000/api/users

# Response Headers:
# X-Trace-Id: 550e8400-e29b-41d4-a716-446655440000
```

외부에서 traceId를 전달하면 그대로 사용됩니다:

```bash
curl -i -H "X-Trace-Id: my-external-trace-id" http://localhost:3000/api/users

# Response Headers:
# X-Trace-Id: my-external-trace-id
```

## Service에서 TraceId 사용

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { TraceContextService } from '@m16khb/nestjs-traceable';

@Injectable()
export class UserService {
  constructor(private readonly trace: TraceContextService) {}

  async findAll() {
    const traceId = this.trace.getTraceId();
    console.log(`[${traceId}] Finding all users...`);

    // 비즈니스 로직
    return this.userRepository.find();
  }
}
```

## @Trace 데코레이터로 Span 추적

메서드 실행을 별도 span으로 추적:

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { Trace } from '@m16khb/nestjs-traceable';

@Injectable()
export class UserService {
  @Trace('find-all-users')
  async findAll() {
    // 이 메서드 실행이 별도 span으로 추적됨
    return this.userRepository.find();
  }

  @Trace('create-user')
  async create(dto: CreateUserDto) {
    // 중첩 span 지원
    return this.userRepository.save(dto);
  }
}
```

## 로그에 TraceId 자동 포함

NestJS Logger와 통합:

```typescript
// app.module.ts
import { TraceModule } from '@m16khb/nestjs-traceable';
import { NestJSLoggerAdapter } from '@m16khb/nestjs-traceable/adapters';

@Module({
  imports: [
    TraceModule.forRoot({
      logger: new NestJSLoggerAdapter(),
    }),
  ],
})
export class AppModule {}
```

이제 모든 로그에 traceId가 자동 포함:

```
[Nest] 12345  - 12/05/2025, 10:30:00 AM     LOG [UserService] Finding user {traceId: "550e8400-e29b-41d4-a716-446655440000"}
```

## 커스텀 설정

```typescript
// app.module.ts
TraceModule.forRoot({
  // HTTP 헤더명 변경
  headerName: 'X-Request-Id',

  // 커스텀 traceId 생성기
  traceIdGenerator: () => `trace-${Date.now()}`,

  // traceId 검증 커스터마이징
  validateTraceId: (id) => id.length <= 64,
});
```

## 비동기 설정 (ConfigService 사용)

```typescript
// app.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TraceModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        headerName: config.get('TRACE_HEADER_NAME', 'X-Trace-Id'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## 다음 단계

- [BullMQ 통합](./docs/bullmq-integration.md) - 비동기 작업 큐 추적
- [gRPC 통합](./docs/grpc-integration.md) - 마이크로서비스 추적
- [Cron 통합](./docs/cron-integration.md) - 스케줄 작업 추적
- [로거 어댑터](./docs/logger-adapters.md) - Winston, Pino 연동

## 주요 API

```typescript
// 서비스에서 사용
class TraceContextService {
  getTraceId(): string | undefined;
  getSpanId(): string | undefined;
  getContext(): TraceContext | undefined;
  startSpan(name: string): Span;
  endSpan(status?: 'ok' | 'error'): void;
}

// 데코레이터
@Trace(operationName?: string)  // 메서드 데코레이터
@Traceable()                     // 클래스 데코레이터

// 모듈
TraceModule.forRoot(options?: TraceModuleOptions)
TraceModule.forRootAsync(options: TraceModuleAsyncOptions)
```

## Troubleshooting

### TraceId가 전파되지 않는 경우

1. `TraceModule`이 전역 모듈로 등록되었는지 확인
2. HTTP 미들웨어가 적용되었는지 확인 (자동 적용됨)
3. 비동기 컨텍스트가 손실되지 않았는지 확인

### 성능 관련

- 기본 오버헤드: <1ms per request
- 메모리: AsyncLocalStorage 사용으로 최소화
- 동시 요청: 1000개 이상 처리 가능

---

**질문이나 이슈가 있으면** [GitHub Issues](https://github.com/m16khb/npm-library/issues)에 등록해 주세요.
