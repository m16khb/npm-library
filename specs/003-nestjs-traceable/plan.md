# Implementation Plan: NestJS Traceable

**Branch**: `003-nestjs-traceable` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-nestjs-traceable/spec.md`

## Summary

NestJS 백엔드 애플리케이션에서 다양한 통신 채널(HTTP, gRPC, Cron, BullMQ)을 통해 요청을 추적하기 위한 traceId 기반 분산 추적 라이브러리. AsyncLocalStorage를 활용한 컨텍스트 전파, 데코레이터 기반 API, 로거 어댑터를 통한 자동 traceId 주입 기능을 제공한다.

## Technical Context

**Language/Version**: TypeScript 5.7+ (ES2022, strict mode)
**Primary Dependencies**: @nestjs/common ^10.0.0 || ^11.0.0, rxjs ^7.0.0 (peerDependencies)
**Storage**: N/A (in-memory AsyncLocalStorage only)
**Testing**: Vitest 2.x, @nestjs/testing
**Target Platform**: Node.js 20+ (AsyncLocalStorage 네이티브 지원)
**Project Type**: npm 라이브러리 (모노레포 패키지)
**Performance Goals**: <1ms 오버헤드 per operation, 1000 동시 요청 컨텍스트 격리
**Constraints**: Zero external dependency (NestJS core만), No Sampling (100% 추적)
**Scale/Scope**: 중소규모 NestJS 애플리케이션 (동시 요청 1000개 기준)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 단일 책임 원칙 (SRP)
- [x] 하나의 패키지는 하나의 핵심 기능만 제공 - **PASS**: traceId 기반 분산 추적만 담당
- [x] 패키지명은 해결하는 문제를 명확히 표현 - **PASS**: `nestjs-traceable`

### II. 개방-폐쇄 원칙 (OCP)
- [x] 핵심 로직은 인터페이스로 추상화 - **PASS**: TraceIdGenerator, LoggerAdapter 인터페이스 제공
- [x] 전략 패턴을 통해 행위를 확장 가능 - **PASS**: 커스텀 traceId 생성 전략, 로거 어댑터 지원

### III. 리스코프 치환 원칙 (LSP)
- [x] 인터페이스 구현체는 동일한 계약 준수 - **PASS**: ITraceContext 인터페이스 정의

### IV. 인터페이스 분리 원칙 (ISP)
- [x] 세분화된 인터페이스로 의존성 최소화 - **PASS**: Readable/Writable 분리 불필요 (단순 API)

### V. 의존성 역전 원칙 (DIP)
- [x] forRoot/forRootAsync 패턴으로 설정 주입 - **PASS**: TraceModule.forRoot() 제공

### 추상화 전략
- [x] Framework-agnostic Core + NestJS Adapter 패턴 - **PASS**: core/와 nestjs/ 분리

### 품질 기준
- [x] TypeScript strict: true - **PASS**
- [x] 테스트 커버리지 80% 이상 - **TARGET**
- [x] 문서화 (README, CLAUDE.md, TSDoc) - **TARGET**
- [x] Core 번들 사이즈 <5KB (gzipped) - **TARGET**
- [x] Core + NestJS adapter 번들 사이즈 <10KB (gzipped) - **TARGET**

### 의존성 정책
- [x] NestJS/Fastify는 peerDependencies - **PASS**
- [x] Zero external dependency - **PASS**

**Constitution Status**: ALL GATES PASSED

## Project Structure

### Documentation (this feature)

```text
specs/003-nestjs-traceable/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── trace-context.ts # TraceContext 인터페이스
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/nestjs-traceable/
├── src/
│   ├── core/                          # Framework-agnostic 순수 로직
│   │   ├── context/
│   │   │   ├── trace-context.ts       # TraceContext 관리
│   │   │   ├── async-storage.ts       # AsyncLocalStorage 래퍼
│   │   │   └── index.ts
│   │   ├── generators/
│   │   │   ├── trace-id.generator.ts  # TraceId 생성기 (UUID v4)
│   │   │   ├── span-id.generator.ts   # SpanId 생성기 (8자리 hex)
│   │   │   └── index.ts
│   │   ├── interfaces/
│   │   │   ├── trace-context.interface.ts
│   │   │   ├── trace-id-generator.interface.ts
│   │   │   ├── span.interface.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── trace.types.ts         # 공통 타입 정의
│   │   └── index.ts
│   │
│   ├── nestjs/                        # NestJS 어댑터
│   │   ├── decorators/
│   │   │   ├── trace.decorator.ts     # @Trace 데코레이터
│   │   │   ├── traceable.decorator.ts # @Traceable 클래스 데코레이터
│   │   │   └── index.ts
│   │   ├── interceptors/
│   │   │   ├── trace.interceptor.ts   # Span 생성 인터셉터
│   │   │   └── index.ts
│   │   ├── middlewares/
│   │   │   ├── http-trace.middleware.ts  # HTTP traceId 추출/주입
│   │   │   └── index.ts
│   │   ├── guards/
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── trace-context.service.ts  # TraceContext 서비스
│   │   │   └── index.ts
│   │   ├── interfaces/
│   │   │   ├── module-options.interface.ts
│   │   │   └── index.ts
│   │   ├── constants.ts
│   │   ├── trace.module.ts            # TraceModule
│   │   └── index.ts
│   │
│   ├── adapters/                      # 로거 어댑터 (선택적)
│   │   ├── logger.adapter.interface.ts
│   │   ├── nestjs-logger.adapter.ts   # NestJS Logger 어댑터
│   │   ├── console.adapter.ts         # Console 어댑터
│   │   └── index.ts
│   │
│   ├── integrations/                  # 채널 통합 (P2/P3)
│   │   ├── bullmq/                    # BullMQ 통합
│   │   │   ├── bullmq-trace.decorator.ts
│   │   │   └── index.ts
│   │   ├── cron/                      # @nestjs/schedule 통합
│   │   │   ├── traced-cron.decorator.ts
│   │   │   └── index.ts
│   │   ├── grpc/                      # gRPC 통합
│   │   │   ├── grpc-trace.interceptor.ts
│   │   │   └── index.ts
│   │   ├── http/                      # HttpService 통합
│   │   │   ├── http-trace.interceptor.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── index.ts                       # 통합 exports
│
├── test/
│   ├── unit/
│   │   ├── core/
│   │   │   ├── trace-context.test.ts
│   │   │   ├── trace-id.generator.test.ts
│   │   │   └── span-id.generator.test.ts
│   │   └── nestjs/
│   │       ├── trace.decorator.test.ts
│   │       └── trace.middleware.test.ts
│   ├── integration/
│   │   ├── trace.module.test.ts
│   │   └── http-flow.test.ts
│   └── e2e/
│       └── full-trace-flow.test.ts
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── CLAUDE.md
```

**Structure Decision**: nestjs-async-utils와 동일한 패턴 적용 - core/(framework-agnostic)와 nestjs/(adapter) 분리. integrations/는 P2/P3 우선순위 채널 통합을 위한 별도 디렉토리.

## Complexity Tracking

> 헌법 위반 없음 - 이 섹션은 비어있음

## Architecture Decisions

### 1. AsyncLocalStorage 기반 컨텍스트 관리

Node.js 20+ 네이티브 AsyncLocalStorage를 사용하여 요청 컨텍스트를 전파한다. cls-hooked 등 폴백 없이 단일 구현만 제공하여 복잡성을 최소화한다.

```typescript
// core/context/async-storage.ts
const storage = new AsyncLocalStorage<TraceContext>();

export function runWithContext<T>(context: TraceContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getContext(): TraceContext | undefined {
  return storage.getStore();
}
```

### 2. 데코레이터 + 인터셉터 조합

데코레이터는 메타데이터 설정만 담당하고, 실제 로직은 인터셉터에서 처리한다 (Constitution 2.3 준수).

```typescript
// @Trace 데코레이터는 메타데이터만 설정
export function Trace(operationName?: string): MethodDecorator {
  return applyDecorators(
    SetMetadata(TRACE_OPERATION, operationName),
    UseInterceptors(TraceInterceptor),
  );
}
```

### 3. 오류 처리 정책 - Silent Continue

추적 시스템 오류 시 서비스 가용성을 우선하여 요청 처리를 계속한다. 내부 경고 로그만 출력.

```typescript
try {
  // 추적 로직
} catch (error) {
  this.logger.warn(`Trace error: ${error.message}`);
  // 요청 처리 계속
}
```

### 4. Lenient TraceId 검증

외부 traceId는 비어있지 않은 128자 이하 문자열이면 허용. 분산 시스템 상호운용성 우선.

## Dependency Graph

```
core/interfaces ← core/generators ← core/context
       ↑                                  ↑
nestjs/decorators ← nestjs/interceptors ← nestjs/middlewares
       ↑                                       ↑
       └──────────── nestjs/services ──────────┘
                          ↑
              nestjs/trace.module
                          ↑
           integrations/* (bullmq, cron, grpc, http)
                          ↑
                    adapters/*
```

## Implementation Phases

### Phase 1: Core Context (P1) - MVP
- TraceContext 인터페이스 및 구현
- AsyncLocalStorage 래퍼
- TraceId/SpanId 생성기
- 기본 테스트

### Phase 2: NestJS Integration (P1)
- TraceModule (forRoot/forRootAsync)
- HTTP Middleware (X-Trace-Id 처리)
- @Trace 데코레이터
- TraceInterceptor

### Phase 3: Logger Adapter (P1)
- LoggerAdapter 인터페이스
- NestJS Logger 어댑터
- Console 어댑터

### Phase 4: Channel Integrations (P2/P3)
- BullMQ 통합 (P2)
- Cron 통합 (P3)
- gRPC 통합 (P3)
- HttpService 통합 (P3)

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AsyncLocalStorage 컨텍스트 손실 | Medium | High | Graceful degradation, 경고 로그 |
| 성능 오버헤드 초과 | Low | Medium | 벤치마크 테스트, 최적화 |
| NestJS 버전 호환성 | Low | High | NestJS 10/11 통합 테스트 |
| BullMQ/gRPC 통합 복잡성 | Medium | Medium | P2/P3로 우선순위 분리 |
