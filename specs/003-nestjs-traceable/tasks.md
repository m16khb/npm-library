# Tasks: NestJS Traceable

**Input**: Design documents from `/specs/003-nestjs-traceable/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: TDD 방식으로 각 User Story에 테스트 포함 (사용자 요청에 따름)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[S]**: Sequential - must follow previous task
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Package root**: `packages/nestjs-traceable/`
- **Source**: `packages/nestjs-traceable/src/`
- **Tests**: `packages/nestjs-traceable/test/`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Package 초기화 및 기본 구조 생성

- [ ] T001 Create package directory structure in packages/nestjs-traceable/
- [ ] T002 [S] Initialize package.json with peerDependencies (@nestjs/common, @nestjs/core, rxjs)
- [ ] T003 [P] Configure tsconfig.json with strict mode and ES2022 target
- [ ] T004 [P] Configure tsup.config.ts for ESM build
- [ ] T005 [P] Configure vitest.config.ts for unit/integration tests
- [ ] T006 [P] Create CLAUDE.md with package documentation

---

## Phase 2: Foundational (Core Context - Blocking Prerequisites)

**Purpose**: Framework-agnostic core 구현 - 모든 User Story의 기반

**CRITICAL**: 이 Phase가 완료되어야 User Story 구현 시작 가능

### Core Interfaces

- [ ] T007 [P] Define ITraceContext interface in src/core/interfaces/trace-context.interface.ts
- [ ] T008 [P] Define ISpan interface in src/core/interfaces/span.interface.ts
- [ ] T009 [P] Define ITraceIdGenerator interface in src/core/interfaces/trace-id-generator.interface.ts
- [ ] T010 [P] Define trace types (SpanStatus, etc.) in src/core/types/trace.types.ts
- [ ] T011 [S] Create core interfaces barrel export in src/core/interfaces/index.ts

### Core Generators (TDD)

- [ ] T012 [P] RED: Write TraceId generator tests in test/unit/core/trace-id.generator.test.ts
- [ ] T013 [P] RED: Write SpanId generator tests in test/unit/core/span-id.generator.test.ts
- [ ] T014 [S] GREEN: Implement TraceId generator (UUID v4) in src/core/generators/trace-id.generator.ts
- [ ] T015 [S] GREEN: Implement SpanId generator (8-char hex) in src/core/generators/span-id.generator.ts
- [ ] T016 [S] Create generators barrel export in src/core/generators/index.ts

### Core Context (TDD)

- [ ] T017 [S] RED: Write AsyncLocalStorage wrapper tests in test/unit/core/async-storage.test.ts
- [ ] T018 [S] GREEN: Implement AsyncLocalStorage wrapper in src/core/context/async-storage.ts
- [ ] T019 [S] RED: Write TraceContext tests in test/unit/core/trace-context.test.ts
- [ ] T020 [S] GREEN: Implement TraceContext manager in src/core/context/trace-context.ts
- [ ] T021 [S] Create context barrel export in src/core/context/index.ts
- [ ] T022 [S] Create core barrel export in src/core/index.ts

**Checkpoint**: Core Context 완료 - User Story 구현 가능

---

## Phase 3: User Story 1 - HTTP 요청 추적 (Priority: P1) MVP

**Goal**: HTTP 요청의 전체 처리 흐름을 단일 traceId로 추적

**Independent Test**: HTTP 요청 시 응답 헤더 X-Trace-Id 확인, 로그에서 동일 traceId 검증

**FR Coverage**: FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-017, FR-018, FR-019, FR-020, FR-021

### NestJS Module Setup

- [ ] T023 [P] [US1] Define module options interface in src/nestjs/interfaces/module-options.interface.ts
- [ ] T024 [P] [US1] Define constants (tokens, metadata keys) in src/nestjs/constants.ts
- [ ] T025 [S] [US1] Create NestJS interfaces barrel export in src/nestjs/interfaces/index.ts

### TraceModule (TDD)

- [ ] T026 [S] [US1] RED: Write TraceModule tests in test/integration/trace.module.test.ts
- [ ] T027 [S] [US1] GREEN: Implement TraceModule with forRoot/forRootAsync in src/nestjs/trace.module.ts

### TraceContextService

- [ ] T028 [S] [US1] RED: Write TraceContextService tests in test/unit/nestjs/trace-context.service.test.ts
- [ ] T029 [S] [US1] GREEN: Implement TraceContextService in src/nestjs/services/trace-context.service.ts
- [ ] T030 [S] [US1] Create services barrel export in src/nestjs/services/index.ts

### HTTP Middleware (TDD)

- [ ] T031 [S] [US1] RED: Write HTTP trace middleware tests in test/unit/nestjs/http-trace.middleware.test.ts
- [ ] T032 [S] [US1] GREEN: Implement HttpTraceMiddleware (traceId 추출/생성/응답헤더) in src/nestjs/middlewares/http-trace.middleware.ts
- [ ] T033 [S] [US1] Create middlewares barrel export in src/nestjs/middlewares/index.ts

### @Trace Decorator (TDD)

- [ ] T034 [S] [US1] RED: Write @Trace decorator tests in test/unit/nestjs/trace.decorator.test.ts
- [ ] T035 [S] [US1] GREEN: Implement @Trace decorator in src/nestjs/decorators/trace.decorator.ts
- [ ] T036 [P] [US1] Implement @Traceable class decorator in src/nestjs/decorators/traceable.decorator.ts
- [ ] T037 [S] [US1] Create decorators barrel export in src/nestjs/decorators/index.ts

### TraceInterceptor (TDD)

- [ ] T038 [S] [US1] RED: Write TraceInterceptor tests in test/unit/nestjs/trace.interceptor.test.ts
- [ ] T039 [S] [US1] GREEN: Implement TraceInterceptor in src/nestjs/interceptors/trace.interceptor.ts
- [ ] T040 [S] [US1] Create interceptors barrel export in src/nestjs/interceptors/index.ts

### NestJS Integration

- [ ] T041 [S] [US1] Create NestJS barrel export in src/nestjs/index.ts
- [ ] T042 [S] [US1] Create main package barrel export in src/index.ts

### HTTP Flow Integration Test

- [ ] T043 [S] [US1] Integration test for HTTP flow in test/integration/http-flow.test.ts

**Checkpoint**: US1 완료 - HTTP 요청 추적 가능, MVP 배포 가능

---

## Phase 4: User Story 2 - 로깅 통합 (Priority: P1)

**Goal**: 로거에 traceId/spanId 자동 주입

**Independent Test**: 로그 출력 시 traceId/spanId 포함 확인

**FR Coverage**: FR-014, FR-015, FR-016

### Logger Adapter Interface

- [ ] T044 [P] [US2] Define ILoggerAdapter interface in src/adapters/logger.adapter.interface.ts

### NestJS Logger Adapter (TDD)

- [ ] T045 [S] [US2] RED: Write NestJS logger adapter tests in test/unit/adapters/nestjs-logger.adapter.test.ts
- [ ] T046 [S] [US2] GREEN: Implement NestJSLoggerAdapter in src/adapters/nestjs-logger.adapter.ts

### Console Adapter

- [ ] T047 [P] [US2] Implement ConsoleAdapter in src/adapters/console.adapter.ts

### Adapters Integration

- [ ] T048 [S] [US2] Create adapters barrel export in src/adapters/index.ts
- [ ] T049 [S] [US2] Update main barrel export to include adapters

### Logger Integration Test

- [ ] T050 [S] [US2] Integration test for logger with trace context in test/integration/logger.test.ts

**Checkpoint**: US1 + US2 완료 - HTTP 추적 + 로깅 통합 완료

---

## Phase 5: User Story 3 - Span 기반 중첩 추적 (Priority: P2)

**Goal**: 복잡한 비즈니스 로직 내 개별 작업 단위를 span으로 구분

**Independent Test**: 중첩 메서드 호출에서 각각 다른 spanId, parent-child 관계 확인

**FR Coverage**: FR-004

### Span Management (TDD)

- [ ] T051 [S] [US3] RED: Write span management tests (startSpan, endSpan, nested spans) in test/unit/core/span.test.ts
- [ ] T052 [S] [US3] GREEN: Enhance TraceContext with span stack management in src/core/context/trace-context.ts
- [ ] T053 [S] [US3] Update TraceContextService for span operations in src/nestjs/services/trace-context.service.ts

### Nested Span Integration Test

- [ ] T054 [S] [US3] Integration test for nested spans in test/integration/nested-span.test.ts

**Checkpoint**: US1 + US2 + US3 완료 - 중첩 Span 추적 가능

---

## Phase 6: User Story 4 - BullMQ Job 추적 (Priority: P2)

**Goal**: 비동기 작업 큐의 job 처리 흐름을 원본 요청과 연결

**Independent Test**: HTTP 요청에서 생성된 job의 로그에서 원본 traceId 확인

**FR Coverage**: FR-011, FR-012

### BullMQ Integration (TDD)

- [ ] T055 [P] [US4] RED: Write BullMQ trace decorator tests in test/unit/integrations/bullmq-trace.test.ts
- [ ] T056 [S] [US4] GREEN: Implement @TracedProcessor decorator in src/integrations/bullmq/bullmq-trace.decorator.ts
- [ ] T057 [S] [US4] Implement job traceId injection utility in src/integrations/bullmq/job-trace.util.ts
- [ ] T058 [S] [US4] Create BullMQ integration barrel export in src/integrations/bullmq/index.ts

### BullMQ Integration Test

- [ ] T059 [S] [US4] Integration test for BullMQ flow (requires Redis mock) in test/integration/bullmq-flow.test.ts

**Checkpoint**: US4 완료 - BullMQ Job 추적 가능

---

## Phase 7: User Story 5 - gRPC 서비스 추적 (Priority: P3)

**Goal**: gRPC 서비스 간 호출에서 traceId 전파

**Independent Test**: gRPC 클라이언트 호출 시 metadata에 trace-id 포함 확인

**FR Coverage**: FR-009, FR-010

### gRPC Integration (TDD)

- [ ] T060 [P] [US5] RED: Write gRPC trace interceptor tests in test/unit/integrations/grpc-trace.test.ts
- [ ] T061 [S] [US5] GREEN: Implement GrpcTraceInterceptor (server-side) in src/integrations/grpc/grpc-trace.interceptor.ts
- [ ] T062 [S] [US5] Implement gRPC client interceptor in src/integrations/grpc/grpc-client-trace.interceptor.ts
- [ ] T063 [S] [US5] Create gRPC integration barrel export in src/integrations/grpc/index.ts

**Checkpoint**: US5 완료 - gRPC 추적 가능

---

## Phase 8: User Story 6 - Cron Job 추적 (Priority: P3)

**Goal**: 스케줄된 작업의 실행을 독립적인 trace로 추적

**Independent Test**: Cron 메서드 실행 시 새로운 traceId 생성 확인

**FR Coverage**: FR-013

### Cron Integration (TDD)

- [ ] T064 [P] [US6] RED: Write @TracedCron decorator tests in test/unit/integrations/traced-cron.test.ts
- [ ] T065 [S] [US6] GREEN: Implement @TracedCron decorator in src/integrations/cron/traced-cron.decorator.ts
- [ ] T066 [S] [US6] Create Cron integration barrel export in src/integrations/cron/index.ts

**Checkpoint**: US6 완료 - Cron Job 추적 가능

---

## Phase 9: User Story 7 - 외부 HTTP 호출 계측 (Priority: P3)

**Goal**: 외부 API 호출 시 traceId 자동 전파

**Independent Test**: HttpService 호출 시 요청 헤더에 X-Trace-Id 포함 확인

**FR Coverage**: FR-008

### HTTP Client Integration (TDD)

- [ ] T067 [P] [US7] RED: Write HTTP client trace interceptor tests in test/unit/integrations/http-trace.test.ts
- [ ] T068 [S] [US7] GREEN: Implement HttpTraceInterceptor for HttpService in src/integrations/http/http-trace.interceptor.ts
- [ ] T069 [S] [US7] Create HTTP integration barrel export in src/integrations/http/index.ts

### Integrations Barrel Export

- [ ] T070 [S] [US7] Create integrations barrel export in src/integrations/index.ts
- [ ] T071 [S] [US7] Update main barrel export to include integrations

**Checkpoint**: US7 완료 - 외부 HTTP 호출 추적 가능

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 문서화, 성능 검증, 품질 개선

### Documentation

- [ ] T072 [P] Create comprehensive README.md with examples
- [ ] T073 [P] Add TSDoc comments to all public APIs

### E2E Testing

- [ ] T074 [S] E2E test for full trace flow (HTTP → Service → BullMQ) in test/e2e/full-trace-flow.test.ts

### Performance Validation

- [ ] T075 [S] Performance benchmark test (<1ms overhead) in test/benchmark/trace-overhead.test.ts

#### T075 상세 명세

**파일**: `test/benchmark/trace-overhead.test.ts`

**측정 항목**:
| 항목 | 목표 | 측정 방법 |
|------|------|----------|
| TraceContext 생성 | < 0.1ms | 10,000회 반복 평균 |
| AsyncLocalStorage 접근 | < 0.01ms | 10,000회 반복 평균 |
| Span 시작/종료 | < 0.2ms | 10,000회 반복 평균 |
| HTTP Middleware 오버헤드 | < 1ms | baseline 대비 차이 |

**구현 예시**:
```typescript
import { performance } from 'perf_hooks';

describe('Trace Overhead Benchmark', () => {
  it('should create TraceContext under 0.1ms', () => {
    const iterations = 10000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      createTraceContext();
    }
    const avgMs = (performance.now() - start) / iterations;
    expect(avgMs).toBeLessThan(0.1);
  });

  it('should process HTTP request with < 1ms overhead', async () => {
    const baselineMs = await measureWithoutTrace();
    const withTraceMs = await measureWithTrace();
    expect(withTraceMs - baselineMs).toBeLessThan(1);
  });
});
```

**리포트 출력**:
```
┌─────────────────────────────────────────────┐
│ NestJS Traceable Performance Report         │
├─────────────────────────────────────────────┤
│ TraceContext creation:     0.0234ms  ✅     │
│ AsyncLocalStorage access:  0.0012ms  ✅     │
│ Span start/end:            0.0891ms  ✅     │
│ HTTP Middleware overhead:  0.4521ms  ✅     │
└─────────────────────────────────────────────┘
```

### Final Validation

- [ ] T076 [S] Run quickstart.md validation - verify 5-minute setup
- [ ] T077 [S] Verify zero external dependencies (only peerDependencies)
- [ ] T078 [S] Check bundle size (<15KB gzipped)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Setup - BLOCKS all user stories
- **Phase 3-9 (User Stories)**: All depend on Phase 2 completion
  - US1 (HTTP): Can start after Phase 2
  - US2 (Logging): Can start after Phase 2, integrates with US1
  - US3 (Span): Depends on US1 (enhances TraceContext)
  - US4 (BullMQ): Can start after Phase 2
  - US5 (gRPC): Can start after Phase 2
  - US6 (Cron): Can start after Phase 2
  - US7 (HTTP Client): Depends on US1 (uses HttpTraceMiddleware pattern)
- **Phase 10 (Polish)**: Depends on all desired user stories

### User Story Dependencies

```
Phase 2 (Core Context)
    │
    ├── US1 (HTTP) ─────────┬── US3 (Span)
    │                       │
    ├── US2 (Logging) ──────┤
    │                       │
    │                       └── US7 (HTTP Client)
    │
    ├── US4 (BullMQ) ───────────────────────────┐
    │                                           │
    ├── US5 (gRPC) ─────────────────────────────┤
    │                                           │
    └── US6 (Cron) ─────────────────────────────┴── Phase 10 (Polish)
```

### Parallel Opportunities

**Phase 1 - Setup:**
- T003, T004, T005, T006 can run in parallel

**Phase 2 - Foundational:**
- T007, T008, T009, T010 (interfaces) can run in parallel
- T012, T013 (generator tests) can run in parallel

**Phase 3 - US1:**
- T023, T024 can run in parallel

**Cross-Story Parallelization:**
- After Phase 2, US4, US5, US6 can be developed in parallel
- US1 + US2 are tightly coupled, best developed sequentially

---

## Parallel Example: Phase 2 Interfaces

```bash
# Launch all interface definitions together:
Task: "Define ITraceContext interface in src/core/interfaces/trace-context.interface.ts"
Task: "Define ISpan interface in src/core/interfaces/span.interface.ts"
Task: "Define ITraceIdGenerator interface in src/core/interfaces/trace-id-generator.interface.ts"
Task: "Define trace types in src/core/types/trace.types.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (Core Context)
3. Complete Phase 3: US1 - HTTP 요청 추적
4. Complete Phase 4: US2 - 로깅 통합
5. **STOP and VALIDATE**: HTTP 추적 + 로그 통합 테스트
6. Deploy/demo if ready - **MVP COMPLETE**

### Incremental Delivery

1. Setup + Foundational → Core ready
2. Add US1 + US2 → Test → Deploy (MVP!)
3. Add US3 → Test → Deploy (Span 추적)
4. Add US4 → Test → Deploy (BullMQ)
5. Add US5, US6, US7 → Test → Deploy (채널 통합)
6. Polish → Final release

### Recommended Commit Strategy

```
feat: RED - TraceContext API contract tests
feat: GREEN - AsyncLocalStorage wrapper implementation
feat: TraceId generator with UUID v4
feat: SpanId generator with 8-char hex
feat: TraceModule with forRoot/forRootAsync
feat: HTTP trace middleware
feat: @Trace decorator
feat: Logger adapters (NestJS, Console)
feat: BullMQ integration
feat: gRPC integration
feat: Cron integration
feat: HttpService integration
docs: README and API documentation
```

---

## Notes

- [P] tasks = different files, no dependencies
- [S] tasks = sequential, depends on previous task
- [Story] label maps task to specific user story
- TDD 순서: RED (테스트 작성 + 실패 확인) → GREEN (최소 구현) → REFACTOR
- 각 Checkpoint에서 독립적 테스트 가능
- Zero external dependency 준수 (peerDependencies만 사용)
