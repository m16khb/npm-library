# NestJS Traceable

NestJS 애플리케이션을 위한 분산 추적 라이브러리. AsyncLocalStorage 또는 nestjs-cls를 통해 요청 추적을 제공합니다.

## 설치

```bash
npm install @m16khb/nestjs-traceable
# 또는
pnpm add @m16khb/nestjs-traceable
# 또는
yarn add @m16khb/nestjs-traceable

# nestjs-cls를 사용하려면 추가 설치
npm install nestjs-cls
```

## 기본 사용법

### 1. AsyncLocalStorage 사용 (기본)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TraceModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    TraceModule.forRoot({
      headerName: 'X-Trace-Id',
      serviceName: 'my-service',
      environment: 'production',
    }),
  ],
})
export class AppModule {}
```

### 2. nestjs-cls 사용

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TraceModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    TraceModule.forRoot({
      clsImplementation: 'nestjs-cls',
      clsOptions: {
        middleware: {
          mount: true,
          extractFromHeaders: ['X-Trace-Id', 'X-Custom-Trace'],
        },
      },
      serviceName: 'my-service',
    }),
  ],
})
export class AppModule {}
```

### 3. 비동기 설정 사용

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TraceModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TraceModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService) => ({
        headerName: configService.get('TRACE_HEADER') || 'X-Trace-Id',
        serviceName: configService.get('SERVICE_NAME'),
        clsImplementation: configService.get('CLS_IMPL') || 'async-local-storage',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## 서비스에서 사용

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { TraceContextService } from '@m16khb/nestjs-traceable';

@Injectable()
export class AppService {
  constructor(private readonly traceService: TraceContextService) {}

  getHello(): string {
    // 현재 traceId 가져오기
    const traceId = this.traceService.getTraceId();

    this.traceService.log('Processing request');

    return `Hello! Trace ID: ${traceId}`;
  }

  async processData() {
    // 자식 컨텍스트 생성
    const childContext = this.traceService.createChild();

    if (childContext) {
      return this.traceService.runWithContextAsync(
        childContext,
        async () => {
          this.traceService.log('Processing in child context');
          // 비즈니스 로직 처리
          return { success: true };
        }
      );
    }
  }
}
```

## 컨트롤러에서 추적

```typescript
// app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { TraceContextService } from '@m16khb/nestjs-traceable';
import { Trace } from '@m16khb/nestjs-traceable';

@Controller()
export class AppController {
  constructor(private readonly traceService: TraceContextService) {}

  @Get()
  getHello() {
    const traceId = this.traceService.getTraceId();
    return { message: 'Hello World', traceId };
  }

  @Get('/traced')
  @Trace('custom-operation')
  getTracedEndpoint() {
    // 이 메서드는 자동으로 추적됩니다
    return { message: 'This is traced' };
  }
}
```

## 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `clsImplementation` | `'async-local-storage' \| 'nestjs-cls'` | `'async-local-storage'` | CLS 구현 방식 선택 |
| `headerName` | `string` | `'X-Trace-Id'` | HTTP 헤더명 |
| `serviceName` | `string` | - | 서비스명 |
| `serviceVersion` | `string` | - | 서비스 버전 |
| `environment` | `string` | - | 환경 (development, production 등) |
| `enabled` | `boolean` | `true` | 추적 활성화 여부 |
| `maxSpanDepth` | `number` | `100` | 최대 span 중첩 깊이 |
| `autoCleanupSpans` | `boolean` | `true` | 미종료 span 자동 정리 |
| `warnOnUnfinishedSpans` | `boolean` | `true` | 미종료 span 경고 로그 |

### CLS 옵션 (nestjs-cls 사용 시)

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `clsOptions.middleware.mount` | `boolean` | `true` | 미들웨어 자동 등록 |
| `clsOptions.middleware.extractFromHeaders` | `string[]` | - | 추출할 헤더 목록 |
| `clsOptions.idGenerator` | `() => string` | - | 사용자 정의 ID 생성기 |

## HTTP 추적

라이브러리가 설정되면 모든 HTTP 요청에 자동으로 traceId가 할당됩니다:

### 요청 시 traceId가 없는 경우
- 새로운 traceId 생성
- 응답 헤더에 `X-Trace-Id` 추가

### 요청 시 traceId가 있는 경우
- 기존 traceId 사용
- 응답 헤더에 동일한 `X-Trace-Id` 추가

## 라이선스

MIT