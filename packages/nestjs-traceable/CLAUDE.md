# @m16khb/nestjs-traceable

## WHAT: 기술 스택

- **TypeScript**: 5.7+ (ES2022, strict mode)
- **Node.js**: 20+
- **NestJS**: 10.x / 11.x 호환

### 필수 의존성 (peerDependencies)

- `@nestjs/common` ^10.0.0 || ^11.0.0
- `@nestjs/core` ^10.0.0 || ^11.0.0
- `nestjs-cls` ^4.0.0 || ^5.0.0 (CLS 컨텍스트 관리)
- `rxjs` ^7.0.0

### 선택적 의존성 (optional peerDependencies)

- `@nestjs/bullmq`, `bullmq` - BullMQ Processor 지원
- `@nestjs/schedule` - Cron 스케줄러 지원
- `nest-winston`, `winston`, `dayjs` - Winston 통합 로거

## WHY: 존재 이유

NestJS 애플리케이션에서 **traceId 기반 분산 추적**을 제공. 다양한 통신 채널(HTTP, gRPC, Kafka, Cron, BullMQ)을 통한 요청을 단일 traceId로 연결하여 분산 시스템의 디버깅과 모니터링을 단순화함.

### 핵심 설계 원칙

1. **nestjs-cls 기반**: Node.js AsyncLocalStorage를 래핑한 검증된 CLS 구현 사용
2. **traceId 전용**: spanId/parentSpanId는 OpenTelemetry에 위임, 본 라이브러리는 traceId만 관리
3. **추상 클래스 패턴**: 상속을 통한 보일러플레이트 제거
4. **선택적 의존성**: 사용하는 기능에 따라 필요한 패키지만 설치

## HOW: 주요 컴포넌트

### 1. Core

- **TraceModule**: 핵심 모듈 (ClsModule 래핑), forRoot/forRootAsync/register 지원
- **TraceContextService**: traceId 접근 API (getTraceId, setTraceId, run, runAsync)

### 2. Abstracts (추상 클래스)

- **TraceableCronService**: Cron 서비스용, `runWithTrace()` 메서드 제공
- **TraceableProcessor**: BullMQ Processor용, `executeJob()` 추상 메서드
- **TraceableQueueService**: Queue 서비스용, `addJob()`, `addBulkJobs()` 메서드

### 3. Interceptors

- **TraceInterceptor**: HTTP 요청 인터셉터
- **TraceGrpcInterceptor**: gRPC 마이크로서비스
- **TraceKafkaInterceptor**: Kafka 이벤트 + `createKafkaTraceHeaders()` 헬퍼

### 4. Logger

- **TraceableLogger**: Winston 기반 NestJS 호환 로거, CLS에서 traceId 자동 주입
- **TraceableLoggerModule**: 로거 모듈, forRoot/forRootAsync 지원

### 5. Decorators

- **@Trace**: 메서드 추적 데코레이터
- **@Traceable**: 클래스 추적 데코레이터

## 파일 구조

```
src/
├── index.ts                    # 메인 export
└── nestjs/
    ├── index.ts                # NestJS exports
    ├── constants.ts            # 상수 정의
    ├── trace.module.ts         # TraceModule
    ├── interfaces/
    │   └── module-options.interface.ts
    ├── services/
    │   └── trace-context.service.ts
    ├── abstracts/
    │   ├── traceable-cron.abstract.ts
    │   ├── traceable-processor.abstract.ts
    │   └── traceable-queue.abstract.ts
    ├── interceptors/
    │   ├── trace.interceptor.ts
    │   ├── trace-grpc.interceptor.ts
    │   └── trace-kafka.interceptor.ts
    ├── decorators/
    │   └── trace.decorator.ts
    └── logger/
        ├── traceable.logger.ts
        └── traceable-logger.module.ts
```

## 테스트

```bash
pnpm test          # 185개 테스트 실행
pnpm test:watch    # Watch 모드
pnpm build         # 빌드
pnpm typecheck     # 타입 체크
```

### 테스트 구조

- `test/unit/` - 단위 테스트 (159개)
- `test/integration/` - 통합 테스트 (26개)
  - `trace-flow.test.ts` - Cron → Queue → Processor 전체 흐름
  - `concurrent-stress.test.ts` - 동시성 및 스트레스 테스트

## 번들 사이즈

| 포맷 | 원본 크기 | gzip |
|------|----------|------|
| ESM | 31.27 KB | 7.2 KB |
| CJS | 32.82 KB | 7.5 KB |

## 주요 명령어

```bash
pnpm build      # 빌드
pnpm test       # 테스트
pnpm typecheck  # 타입 체크
pnpm clean      # 빌드 결과물 삭제
```
