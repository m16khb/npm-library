# Tasks: @npm-library/async-utils

**Input**: Design documents from `/specs/001-async-utils/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: 포함됨 - 스펙에서 80% 이상 테스트 커버리지 요구

**Organization**: 태스크는 사용자 스토리별로 그룹화되어 독립적 구현 및 테스트가 가능합니다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 사용자 스토리 (예: US1, US2, US3)
- 설명에 정확한 파일 경로 포함

## Path Conventions

```text
packages/async-utils/
├── src/
│   ├── core/           # Framework-agnostic
│   └── nestjs/         # NestJS Integration
└── test/
    ├── unit/
    ├── integration/
    └── helpers/
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화 및 기본 구조 설정

- [ ] T001 Create project structure per implementation plan in packages/async-utils/
- [ ] T002 Initialize TypeScript project with package.json in packages/async-utils/package.json
- [ ] T003 [P] Configure tsconfig.json with ES2022, strict mode in packages/async-utils/tsconfig.json
- [ ] T004 [P] Configure tsup.config.ts with ESM, DTS generation in packages/async-utils/tsup.config.ts
- [ ] T005 [P] Configure vitest.config.ts with fake-timers support in packages/async-utils/vitest.config.ts
- [ ] T006 [P] Create test helper for fake timers in packages/async-utils/test/helpers/timer-helpers.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리에 필요한 핵심 인프라

**CRITICAL**: 이 페이즈가 완료되기 전까지 사용자 스토리 작업을 시작할 수 없음

- [ ] T007 [P] Implement AbortError class in packages/async-utils/src/core/errors/abort-error.ts
- [ ] T008 [P] Implement RetryError class in packages/async-utils/src/core/errors/retry-error.ts
- [ ] T009 [P] Implement TimeoutError class in packages/async-utils/src/core/errors/timeout-error.ts
- [ ] T010 Implement abort-utils (checkAborted, createAbortableDelay) in packages/async-utils/src/core/utils/abort-utils.ts
- [ ] T011 Create core/index.ts with error exports in packages/async-utils/src/core/index.ts
- [ ] T012 [P] Unit test for error classes in packages/async-utils/test/unit/errors.test.ts
- [ ] T013 [P] Unit test for abort-utils in packages/async-utils/test/utils/abort-utils.test.ts

**Checkpoint**: Foundation ready - 에러 클래스와 AbortSignal 유틸리티 완료

---

## Phase 3: User Story 1 - HTTP 클라이언트 재시도 (Priority: P1)

**Goal**: 외부 API 호출 실패 시 자동으로 재시도하여 안정적인 서비스 제공

**Independent Test**: retry 래퍼를 적용하고, 의도적 실패를 유발하여 재시도 동작 검증

### Types for User Story 1

- [ ] T014 [P] [US1] Define RetryStrategy interface in packages/async-utils/src/core/retry/types.ts
- [ ] T015 [P] [US1] Define RetryOptions interface in packages/async-utils/src/core/retry/types.ts

### Implementation for User Story 1

- [ ] T016 [US1] Implement ExponentialBackoff strategy (100ms base, 10s max, 2x) in packages/async-utils/src/core/retry/strategies.ts
- [ ] T017 [US1] Implement LinearBackoff strategy (1000ms delay) in packages/async-utils/src/core/retry/strategies.ts
- [ ] T018 [US1] Implement retry function with strategy, retryIf, signal, onRetry in packages/async-utils/src/core/retry/retry.ts
- [ ] T019 [US1] Export retry module from core/retry/index.ts in packages/async-utils/src/core/retry/index.ts
- [ ] T020 [US1] Update core/index.ts to export retry module in packages/async-utils/src/core/index.ts

### Tests for User Story 1

- [ ] T021 [P] [US1] Unit test: basic retry with success after failures in packages/async-utils/test/unit/retry.test.ts
- [ ] T022 [P] [US1] Unit test: exponential backoff delays (100ms, 200ms, 400ms) in packages/async-utils/test/unit/retry.test.ts
- [ ] T023 [P] [US1] Unit test: linear backoff delays (fixed 1000ms) in packages/async-utils/test/unit/retry.test.ts
- [ ] T024 [P] [US1] Unit test: retryIf filter (skip non-retryable errors) in packages/async-utils/test/unit/retry.test.ts
- [ ] T025 [P] [US1] Unit test: AbortSignal cancellation in packages/async-utils/test/unit/retry.test.ts
- [ ] T026 [P] [US1] Unit test: RetryError with cause chain in packages/async-utils/test/unit/retry.test.ts
- [ ] T027 [P] [US1] Unit test: onRetry callback invocation in packages/async-utils/test/unit/retry.test.ts

**Checkpoint**: retry 함수가 완전히 동작하고 독립적으로 테스트 가능

---

## Phase 4: User Story 2 - 대량 작업 동시성 제한 (Priority: P1)

**Goal**: 수천 개의 비동기 작업을 동시에 N개씩만 실행하여 리소스 효율적 사용

**Independent Test**: 100개 작업을 동시 실행 제한 5로 설정하고, 동시에 5개 이하만 실행되는지 검증

### Types for User Story 2

- [ ] T028 [P] [US2] Define LimitFunction interface in packages/async-utils/src/core/concurrency/types.ts
- [ ] T029 [P] [US2] Define LimitTaskOptions interface in packages/async-utils/src/core/concurrency/types.ts
- [ ] T030 [P] [US2] Define QueueItem interface (internal) in packages/async-utils/src/core/concurrency/types.ts

### Implementation for User Story 2

- [ ] T031 [US2] Implement PriorityQueue class (min-heap based) in packages/async-utils/src/core/concurrency/priority-queue.ts
- [ ] T032 [US2] Implement pLimit function with activeCount, pendingCount in packages/async-utils/src/core/concurrency/p-limit.ts
- [ ] T033 [US2] Add priority support (0-10 range, default 5) to pLimit in packages/async-utils/src/core/concurrency/p-limit.ts
- [ ] T034 [US2] Add setConcurrency dynamic adjustment to pLimit in packages/async-utils/src/core/concurrency/p-limit.ts
- [ ] T035 [US2] Add clearQueue method to pLimit in packages/async-utils/src/core/concurrency/p-limit.ts
- [ ] T036 [US2] Export concurrency module from core/concurrency/index.ts in packages/async-utils/src/core/concurrency/index.ts
- [ ] T037 [US2] Update core/index.ts to export concurrency module in packages/async-utils/src/core/index.ts

### Tests for User Story 2

- [ ] T038 [P] [US2] Unit test: max concurrent tasks (5 of 100) in packages/async-utils/test/unit/p-limit.test.ts
- [ ] T039 [P] [US2] Unit test: queue FIFO execution in packages/async-utils/test/unit/p-limit.test.ts
- [ ] T040 [P] [US2] Unit test: priority-based execution (higher first) in packages/async-utils/test/unit/p-limit.test.ts
- [ ] T041 [P] [US2] Unit test: dynamic concurrency adjustment in packages/async-utils/test/unit/p-limit.test.ts
- [ ] T042 [P] [US2] Unit test: activeCount and pendingCount accuracy in packages/async-utils/test/unit/p-limit.test.ts
- [ ] T043 [P] [US2] Unit test: clearQueue with AbortError rejection in packages/async-utils/test/unit/p-limit.test.ts

**Checkpoint**: pLimit 함수가 완전히 동작하고 독립적으로 테스트 가능

---

## Phase 5: User Story 4 - 비동기 작업 타임아웃 (Priority: P2)

**Goal**: 비동기 작업에 타임아웃을 적용하여 무한 대기 방지

**Independent Test**: 의도적 지연 함수에 타임아웃 적용, 제한 시간 초과 시 에러 발생 검증

**Note**: US4가 US3보다 먼저 구현됨 - NestJS 통합에서 timeout을 사용하기 위함

### Types for User Story 4

- [ ] T044 [P] [US4] Define TimeoutOptions interface in packages/async-utils/src/core/timeout/types.ts

### Implementation for User Story 4

- [ ] T045 [US4] Implement pTimeout function with milliseconds, fallback in packages/async-utils/src/core/timeout/timeout.ts
- [ ] T046 [US4] Add AbortSignal support to pTimeout in packages/async-utils/src/core/timeout/timeout.ts
- [ ] T047 [US4] Add onTimeout callback and cleanup function to pTimeout in packages/async-utils/src/core/timeout/timeout.ts
- [ ] T048 [US4] Export timeout module from core/timeout/index.ts in packages/async-utils/src/core/timeout/index.ts
- [ ] T049 [US4] Update core/index.ts to export timeout module in packages/async-utils/src/core/index.ts

### Tests for User Story 4

- [ ] T050 [P] [US4] Unit test: timeout fires after milliseconds in packages/async-utils/test/unit/timeout.test.ts
- [ ] T051 [P] [US4] Unit test: fallback value returned on timeout in packages/async-utils/test/unit/timeout.test.ts
- [ ] T052 [P] [US4] Unit test: AbortSignal cancellation in packages/async-utils/test/unit/timeout.test.ts
- [ ] T053 [P] [US4] Unit test: cleanup function called on timeout in packages/async-utils/test/unit/timeout.test.ts
- [ ] T054 [P] [US4] Unit test: onTimeout callback invocation in packages/async-utils/test/unit/timeout.test.ts

**Checkpoint**: pTimeout 함수가 완전히 동작하고 독립적으로 테스트 가능

---

## Phase 5.5: Edge Cases & Observability (Cross-Cutting)

**Purpose**: Edge Case 테스트 및 FR-026 메트릭 콜백 구현

### Implementation

- [ ] T054a [P] Implement onSuccess/onError callbacks in retry options in packages/async-utils/src/core/retry/types.ts
- [ ] T054b [P] Implement onSuccess/onError callbacks in timeout options in packages/async-utils/src/core/timeout/types.ts

### Edge Case Tests

- [ ] T054c [P] Unit test: 재시도 횟수 0 동작 검증 in packages/async-utils/test/unit/retry.test.ts
- [ ] T054d [P] Unit test: 타임아웃 0ms 즉시 에러 검증 in packages/async-utils/test/unit/timeout.test.ts
- [ ] T054e [P] Unit test: 동시성 0 설정 에러 검증 in packages/async-utils/test/unit/p-limit.test.ts
- [ ] T054f [P] Unit test: 이미 abort된 signal 즉시 에러 검증 in packages/async-utils/test/unit/abort-utils.test.ts
- [ ] T054g [P] Unit test: 에러 cause chain 보존 검증 in packages/async-utils/test/unit/errors.test.ts
- [ ] T054h [P] Unit test: 리소스 정리 100ms 이내 검증 in packages/async-utils/test/unit/cleanup.test.ts

**Checkpoint**: 모든 Edge Case 및 메트릭 콜백 테스트 통과

---

## Phase 6: User Story 3 - NestJS 통합 (Priority: P1)

**Goal**: 데코레이터와 모듈로 쉽게 통합하여 NestJS 패턴과 일관된 방식으로 사용

**Independent Test**: NestJS TestingModule에서 데코레이터 적용 서비스 생성 및 동작 검증

**Dependencies**: US1 (retry), US2 (pLimit), US4 (timeout) 완료 필요

### Types for User Story 3

- [ ] T055 [P] [US3] Define injection tokens (ASYNC_UTILS_OPTIONS) in packages/async-utils/src/nestjs/constants.ts
- [ ] T056 [P] [US3] Define AsyncUtilsModuleOptions interface in packages/async-utils/src/nestjs/module.ts
- [ ] T057 [P] [US3] Define decorator option interfaces in packages/async-utils/src/nestjs/decorators/

### Implementation for User Story 3

- [ ] T058 [US3] Implement AsyncUtilsModule.forRoot() in packages/async-utils/src/nestjs/module.ts
- [ ] T059 [US3] Implement AsyncUtilsModule.forRootAsync() in packages/async-utils/src/nestjs/module.ts
- [ ] T060 [US3] Implement @Retryable() decorator in packages/async-utils/src/nestjs/decorators/retryable.ts
- [ ] T061 [US3] Implement @Timeout() decorator in packages/async-utils/src/nestjs/decorators/timeout.ts
- [ ] T062 [US3] Implement @ConcurrencyLimit() decorator in packages/async-utils/src/nestjs/decorators/concurrency.ts
- [ ] T063 [US3] Implement RetryInterceptor in packages/async-utils/src/nestjs/interceptors/retry.interceptor.ts
- [ ] T064 [US3] Implement TimeoutInterceptor in packages/async-utils/src/nestjs/interceptors/timeout.interceptor.ts
- [ ] T065 [US3] Export nestjs module from nestjs/index.ts in packages/async-utils/src/nestjs/index.ts
- [ ] T066 [US3] Create main index.ts with unified exports in packages/async-utils/src/index.ts

### Tests for User Story 3

- [ ] T067 [P] [US3] Integration test: AsyncUtilsModule.forRoot() in packages/async-utils/test/integration/nestjs-module.test.ts
- [ ] T068 [P] [US3] Integration test: AsyncUtilsModule.forRootAsync() with ConfigService in packages/async-utils/test/integration/nestjs-module.test.ts
- [ ] T069 [P] [US3] Integration test: @Retryable() decorator retry behavior in packages/async-utils/test/integration/decorators.test.ts
- [ ] T070 [P] [US3] Integration test: @Timeout() decorator timeout behavior in packages/async-utils/test/integration/decorators.test.ts
- [ ] T071 [P] [US3] Integration test: @ConcurrencyLimit() decorator concurrency in packages/async-utils/test/integration/decorators.test.ts
- [ ] T072 [P] [US3] Integration test: RetryInterceptor on controller in packages/async-utils/test/integration/decorators.test.ts

**Checkpoint**: NestJS 모듈과 데코레이터가 완전히 동작하고 독립적으로 테스트 가능

---

## Phase 7: User Story 5 - 통합 사용 (Priority: P2)

**Goal**: retry + timeout + concurrency를 조합하여 복잡한 비동기 워크플로우 처리

**Independent Test**: 타임아웃이 설정된 재시도 작업을 동시성 제한 내에서 실행, 각 레이어 동작 검증

**Dependencies**: US1, US2, US3, US4 모두 완료 필요

### Tests for User Story 5

- [ ] T073 [P] [US5] Integration test: retry + timeout combination in packages/async-utils/test/integration/combined.test.ts
- [ ] T074 [P] [US5] Integration test: concurrency + retry combination in packages/async-utils/test/integration/combined.test.ts
- [ ] T075 [P] [US5] Integration test: AbortSignal propagation across all layers in packages/async-utils/test/integration/combined.test.ts
- [ ] T076 [US5] Integration test: full stack (limit + retry + timeout) in packages/async-utils/test/integration/combined.test.ts

**Checkpoint**: 모든 기능의 조합이 올바르게 동작함

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 모든 사용자 스토리에 영향을 미치는 개선 사항

- [ ] T077 [P] Create CLAUDE.md with package documentation in packages/async-utils/CLAUDE.md
- [ ] T078 [P] Create README.md with installation, usage, API reference in packages/async-utils/README.md
- [ ] T079 [P] Add TSDoc comments to all public APIs in packages/async-utils/src/
- [ ] T080 Verify bundle size (Core < 5KB, Full < 15KB) with tsup build in packages/async-utils/
- [ ] T081 Run full test suite and verify 80%+ coverage in packages/async-utils/
- [ ] T082 Validate quickstart.md examples work correctly in packages/async-utils/

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────────┐
                                                                  │
Phase 2 (Foundational: Errors, AbortUtils) ◄─────────────────────┘
        │
        ├──────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          ▼
Phase 3 (US1: Retry)                              Phase 4 (US2: pLimit)
        │                                                          │
        └────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
                  Phase 5 (US4: Timeout)
                         │
                         ▼
                  Phase 6 (US3: NestJS Integration)
                         │
                         ▼
                  Phase 7 (US5: Combined Usage)
                         │
                         ▼
                  Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Retry) | Foundational | US2 |
| US2 (pLimit) | Foundational | US1 |
| US4 (Timeout) | Foundational | US1, US2 (after types) |
| US3 (NestJS) | US1, US2, US4 | - |
| US5 (Combined) | US1, US2, US3, US4 | - |

### Within Each User Story

1. Types → Implementation → Tests
2. 모든 테스트는 구현 후 작성 (또는 TDD 선호 시 먼저)
3. 모듈 exports 업데이트
4. Checkpoint에서 독립 테스트 검증

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003, T004, T005, T006 모두 병렬 가능

**Phase 2 (Foundational)**:
- T007, T008, T009 (에러 클래스) 병렬 가능
- T012, T013 (테스트) 병렬 가능

**Phase 3 (US1) + Phase 4 (US2)**:
- US1과 US2는 완전히 병렬 실행 가능
- 각 스토리 내 테스트들 병렬 가능

**Phase 6 (US3)**:
- T055, T056, T057 (타입) 병렬 가능
- T067-T072 (테스트) 병렬 가능

---

## Parallel Example: Phase 3 + 4 (US1 + US2)

```bash
# 두 개발자가 동시에 작업 가능:

# Developer A - US1 (Retry):
Task: "T014 [US1] Define RetryStrategy interface"
Task: "T016 [US1] Implement ExponentialBackoff strategy"
Task: "T018 [US1] Implement retry function"
Task: "T021-T027 [US1] Unit tests for retry"

# Developer B - US2 (pLimit):
Task: "T028 [US2] Define LimitFunction interface"
Task: "T031 [US2] Implement PriorityQueue class"
Task: "T032 [US2] Implement pLimit function"
Task: "T038-T043 [US2] Unit tests for pLimit"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Retry)
4. **STOP and VALIDATE**: retry 함수 독립 테스트
5. 필요시 배포/데모

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Retry) → Test → Deploy (MVP!)
3. Add US2 (pLimit) + US4 (Timeout) → Test → Deploy
4. Add US3 (NestJS) → Test → Deploy
5. Add US5 (Combined) → Test → Deploy
6. Polish → Final Release

### Suggested MVP Scope

**최소 MVP**: Phase 1-3 (Setup + Foundational + US1 Retry)
- `retry` 함수와 백오프 전략만으로도 가치 제공
- 약 18개 태스크로 빠른 초기 릴리스 가능

**권장 MVP**: Phase 1-5 (Setup + Foundational + US1 + US2 + US4)
- 핵심 3가지 기능 (retry, pLimit, pTimeout) 모두 포함
- NestJS 없이 순수 TypeScript로 사용 가능
- 약 54개 태스크

---

## Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| Phase 1 | Setup | 6 | 4 |
| Phase 2 | Foundational | 7 | 5 |
| Phase 3 | US1 (Retry) | 14 | 9 |
| Phase 4 | US2 (pLimit) | 16 | 8 |
| Phase 5 | US4 (Timeout) | 11 | 6 |
| Phase 5.5 | Edge Cases & Observability | 8 | 8 |
| Phase 6 | US3 (NestJS) | 18 | 9 |
| Phase 7 | US5 (Combined) | 4 | 3 |
| Phase 8 | Polish | 6 | 3 |
| **Total** | | **90** | **55** |

---

## Notes

- [P] 태스크 = 다른 파일, 의존성 없음
- [Story] 라벨 = 추적 가능성을 위한 사용자 스토리 매핑
- 각 사용자 스토리는 독립적으로 완료 및 테스트 가능해야 함
- 테스트 실패 확인 후 구현 (TDD 선호 시)
- 각 태스크 또는 논리적 그룹 후 커밋
- Checkpoint에서 스토리 독립 검증 가능
- 회피: 모호한 태스크, 같은 파일 충돌, 독립성을 깨는 스토리 간 의존성
