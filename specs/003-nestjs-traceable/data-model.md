# Data Model: NestJS Traceable

**Date**: 2025-12-05
**Feature**: 003-nestjs-traceable

## Core Entities

### 1. TraceContext

요청 전체를 식별하는 추적 컨텍스트. AsyncLocalStorage에 저장되어 요청 수명 동안 유지된다.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| traceId | string | 요청 전체를 식별하는 고유 ID | 1-128자, 비어있지 않음 |
| spanId | string | 현재 작업 단위를 식별하는 ID | 8자리 hex |
| parentSpanId | string \| undefined | 부모 span의 ID | 8자리 hex 또는 undefined |
| startTime | number | 컨텍스트 시작 시간 (ms) | Unix timestamp |

```typescript
interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly startTime: number;
}
```

### 2. Span

개별 작업 단위를 나타내는 엔티티. 중첩 구조를 지원한다.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| traceId | string | 소속된 trace의 ID | TraceContext.traceId 참조 |
| spanId | string | 현재 span의 고유 ID | 8자리 hex |
| parentSpanId | string \| undefined | 부모 span의 ID | 8자리 hex 또는 undefined |
| operationName | string | 작업명 | 비어있지 않음 |
| startTime | number | 시작 시간 (ms) | Unix timestamp |
| endTime | number \| undefined | 종료 시간 (ms) | Unix timestamp 또는 undefined |
| status | SpanStatus | 작업 상태 | 'ok' \| 'error' |

```typescript
interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly operationName: string;
  readonly startTime: number;
  endTime?: number;
  status: SpanStatus;
}

type SpanStatus = 'ok' | 'error';
```

### 3. TraceModuleOptions

모듈 설정 옵션.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| headerName | string | HTTP 헤더명 | 'X-Trace-Id' |
| traceIdGenerator | () => string | traceId 생성 함수 | UUID v4 |
| spanIdGenerator | () => string | spanId 생성 함수 | 8자리 hex |
| validateTraceId | (id: string) => boolean | traceId 검증 함수 | Lenient (128자 제한) |
| logger | LoggerAdapter \| undefined | 로거 어댑터 | undefined |
| global | boolean | 전역 모듈 여부 | true |
| maxSpanDepth | number | Span 최대 중첩 깊이 | 100 |
| autoCleanupSpans | boolean | 미종료 span 자동 정리 | true |
| warnOnUnfinishedSpans | boolean | 미종료 span 경고 로그 | true |

```typescript
interface TraceModuleOptions {
  headerName?: string;
  traceIdGenerator?: () => string;
  spanIdGenerator?: () => string;
  validateTraceId?: (id: string) => boolean;
  logger?: LoggerAdapter;
  global?: boolean;
  maxSpanDepth?: number;
  autoCleanupSpans?: boolean;
  warnOnUnfinishedSpans?: boolean;
}
```

### 4. TraceModuleAsyncOptions

비동기 모듈 설정 옵션 (forRootAsync용).

| Field | Type | Description |
|-------|------|-------------|
| imports | Type<any>[] | 의존 모듈 |
| useFactory | (...args) => TraceModuleOptions | 팩토리 함수 |
| inject | any[] | 주입할 의존성 |

```typescript
interface TraceModuleAsyncOptions {
  imports?: Type<any>[];
  useFactory: (...args: any[]) => TraceModuleOptions | Promise<TraceModuleOptions>;
  inject?: any[];
}
```

## Adapter Interfaces

### 5. ClsAdapter

CLS(Continuation Local Storage) 어댑터 인터페이스. 구현을 추상화한다.

```typescript
interface ClsAdapter {
  getCurrent(): TraceContext | undefined;
  run<T>(context: TraceContext, fn: () => T): T;
  runAsync<T>(context: TraceContext, fn: () => Promise<T>): Promise<T>;
  hasContext(): boolean;
}

// AsyncLocalStorage 기반 어댑터
class AsyncLocalStorageClsAdapter implements ClsAdapter {
  constructor(storage: AsyncLocalStorage<TraceContext>);
  // 메서드 구현
}

// nestjs-cls 기반 어댑터
class NestjsClsAdapter implements ClsAdapter {
  constructor(clsService: ClsService);
  // 메서드 구현
}
```

### 6. LoggerAdapter

로거 어댑터 인터페이스.

```typescript
interface LoggerAdapter {
  log(message: string, context?: TraceContext): void;
  error(message: string, trace?: string, context?: TraceContext): void;
  warn(message: string, context?: TraceContext): void;
  debug?(message: string, context?: TraceContext): void;
  verbose?(message: string, context?: TraceContext): void;
}
```

### 6. TraceIdGenerator

traceId 생성기 인터페이스.

```typescript
interface TraceIdGenerator {
  generate(): string;
}
```

## Type Definitions

### TraceId Validation Rules

```typescript
// Lenient 검증
const TRACE_ID_MAX_LENGTH = 128;

function isValidTraceId(id: unknown): boolean {
  return typeof id === 'string' &&
         id.length > 0 &&
         id.length <= TRACE_ID_MAX_LENGTH;
}
```

### SpanId Format

```typescript
// 8자리 hex
const SPAN_ID_LENGTH = 8;

function isValidSpanId(id: string): boolean {
  return /^[0-9a-f]{8}$/.test(id);
}
```

## State Transitions

### TraceContext Lifecycle

```
[No Context]
    │
    ▼ (HTTP Request / gRPC Call / Cron Trigger / BullMQ Job)
[Context Created] ─────────────────┐
    │                              │
    ▼ startSpan()                  │
[Span Started]                     │
    │                              │
    ├─▶ startSpan() (child)        │
    │   └─▶ [Nested Span]          │
    │       └─▶ endSpan()          │
    │                              │
    ▼ endSpan()                    │
[Span Ended]                       │
    │                              │
    ▼ (Request Complete)           │
[Context Destroyed] ◀──────────────┘
```

### Span Status Transitions

```
[Created] ─▶ [ok] ─▶ [Completed]
    │
    └─▶ [error] ─▶ [Completed]
```

## Entity Relationships

```
TraceModuleOptions
       │
       ▼
 TraceModule ─────────────────────────────┐
       │                                  │
       ▼                                  ▼
 TraceContext ─────────────────▶  LoggerAdapter
       │
       ├──▶ Span (root)
       │     │
       │     ├──▶ Span (child)
       │     │     │
       │     │     └──▶ Span (grandchild)
       │     │
       │     └──▶ Span (child)
       │
       └──▶ (propagates to)
             ├── HTTP Response Header
             ├── gRPC Metadata
             ├── BullMQ Job Data
             └── Logger Output
```

## Validation Rules Summary

| Entity | Field | Rule |
|--------|-------|------|
| TraceContext | traceId | 1-128자, 비어있지 않음 |
| TraceContext | spanId | 8자리 hex |
| Span | operationName | 비어있지 않음 |
| TraceModuleOptions | headerName | HTTP 헤더 형식 |
