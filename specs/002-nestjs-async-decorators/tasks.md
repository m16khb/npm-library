# Tasks: NestJS 비동기 유틸리티 데코레이터 통합

**Input**: Design documents from `/specs/002-nestjs-async-decorators/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 테스트는 별도 phase에서 진행 (TDD 없음, 구현 우선)

**Organization**: 태스크는 User Story별로 그룹화되어 독립적 구현 및 테스트 가능

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 태스크의 User Story (예: US1, US2, US3)
- 정확한 파일 경로 포함

## Path Conventions

```text
packages/async-utils/
├── src/
│   ├── core/           # 기존 (수정 없음)
│   └── nestjs/         # 신규 NestJS 어댑터
└── test/
    ├── unit/nestjs/
    └── integration/nestjs/
```

---

## Phase 1: Setup

**Purpose**: NestJS 통합을 위한 기본 구조 생성

- [X] T001 Create NestJS adapter directory structure in `packages/async-utils/src/nestjs/`
- [X] T002 [P] Add @nestjs/common and @nestjs/core as peerDependencies in `packages/async-utils/package.json`
- [X] T003 [P] Add @nestjs/testing to devDependencies in `packages/async-utils/package.json`
- [X] T004 Update exports in `packages/async-utils/package.json` to include `./nestjs` subpath

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 User Story에서 공유하는 핵심 인프라 구현

**CRITICAL**: 이 Phase가 완료되어야 User Story 작업 시작 가능

- [X] T005 Define DI tokens and metadata keys in `packages/async-utils/src/nestjs/constants.ts`
- [X] T006 Define library defaults in `packages/async-utils/src/nestjs/defaults.ts`
- [X] T007 [P] Create AsyncUtilsModuleOptions interface in `packages/async-utils/src/nestjs/interfaces/module-options.interface.ts`
- [X] T008 [P] Create RetryableOptions interface in `packages/async-utils/src/nestjs/interfaces/retryable-options.interface.ts`
- [X] T009 [P] Create TimeoutOptions interface in `packages/async-utils/src/nestjs/interfaces/timeout-options.interface.ts`
- [X] T010 [P] Create ConcurrencyLimitOptions interface in `packages/async-utils/src/nestjs/interfaces/concurrency-options.interface.ts`
- [X] T011 Create interfaces barrel export in `packages/async-utils/src/nestjs/interfaces/index.ts`
- [X] T012 Create QueueTimeoutError class in `packages/async-utils/src/nestjs/errors/queue-timeout-error.ts`

**Checkpoint**: Foundation ready - User Story 구현 시작 가능

---

## Phase 3: User Story 1 - 외부 API 호출 재시도 (Priority: P1)

**Goal**: `@Retryable()` 데코레이터로 메서드 실패 시 자동 재시도 기능 제공

**Independent Test**: PaymentService에 `@Retryable({ retries: 3 })`를 적용하고, 2번 실패 후 3번째 성공 시 결과 반환 확인

### Implementation for User Story 1

- [X] T013 [US1] Implement RetryableInterceptor in `packages/async-utils/src/nestjs/interceptors/retryable.interceptor.ts`
  - Inject MODULE_OPTIONS for global defaults
  - Use Reflector to get method metadata
  - Call core retry() function with merged options
  - Handle enableLogging option
- [X] T014 [US1] Implement Retryable decorator in `packages/async-utils/src/nestjs/decorators/retryable.decorator.ts`
  - Use applyDecorators with SetMetadata and UseInterceptors
  - Support RetryableOptions parameter
- [X] T015 [US1] Export RetryableInterceptor from `packages/async-utils/src/nestjs/interceptors/index.ts`
- [X] T016 [US1] Export Retryable decorator from `packages/async-utils/src/nestjs/decorators/index.ts`

**Checkpoint**: @Retryable 데코레이터가 독립적으로 동작 가능 (모듈 등록 없이 라이브러리 기본값 사용)

---

## Phase 4: User Story 2 - 느린 메서드 타임아웃 처리 (Priority: P1)

**Goal**: `@Timeout()` 데코레이터로 메서드 실행 시간 제한 및 TimeoutError 발생

**Independent Test**: ReportService에 `@Timeout(5000)`을 적용하고, 10초 걸리는 작업에서 5초 후 TimeoutError 발생 확인

### Implementation for User Story 2

- [X] T017 [US2] Implement TimeoutInterceptor in `packages/async-utils/src/nestjs/interceptors/timeout.interceptor.ts`
  - Inject MODULE_OPTIONS for global defaults
  - Use Reflector to get method metadata
  - Call core pTimeout() function with merged options
  - Support AbortSignal propagation
  - Handle enableLogging option
- [X] T018 [US2] Implement Timeout decorator in `packages/async-utils/src/nestjs/decorators/timeout.decorator.ts`
  - Use applyDecorators with SetMetadata and UseInterceptors
  - Support both number and TimeoutOptions parameter
- [X] T019 [US2] Export TimeoutInterceptor from `packages/async-utils/src/nestjs/interceptors/index.ts`
- [X] T020 [US2] Export Timeout decorator from `packages/async-utils/src/nestjs/decorators/index.ts`

**Checkpoint**: @Timeout 데코레이터가 독립적으로 동작 가능

---

## Phase 5: User Story 3 - 동시 실행 수 제한 (Priority: P2)

**Goal**: `@ConcurrencyLimit()` 데코레이터로 동일 메서드의 동시 실행 수 제한

**Independent Test**: ExternalApiService에 `@ConcurrencyLimit(3)`을 적용하고, 10개 동시 요청 중 최대 3개만 동시 실행 확인

### Implementation for User Story 3

- [X] T021 [US3] Implement ConcurrencyManagerService in `packages/async-utils/src/nestjs/services/concurrency-manager.service.ts`
  - Manage Map<string, LimitFunction> for per-method concurrency
  - getLimiter(className, methodName, limit) method
  - getState(className, methodName) for observability
- [X] T022 [US3] Implement ConcurrencyLimitInterceptor in `packages/async-utils/src/nestjs/interceptors/concurrency-limit.interceptor.ts`
  - Inject ConcurrencyManagerService and MODULE_OPTIONS
  - Use Reflector to get method metadata
  - Get or create limiter via ConcurrencyManagerService
  - Support queueTimeout option with QueueTimeoutError
  - Handle enableLogging option
- [X] T023 [US3] Implement ConcurrencyLimit decorator in `packages/async-utils/src/nestjs/decorators/concurrency-limit.decorator.ts`
  - Use applyDecorators with SetMetadata and UseInterceptors
  - Support both number and ConcurrencyLimitOptions parameter
- [X] T024 [US3] Export ConcurrencyManagerService from `packages/async-utils/src/nestjs/services/index.ts`
- [X] T025 [US3] Export ConcurrencyLimitInterceptor from `packages/async-utils/src/nestjs/interceptors/index.ts`
- [X] T026 [US3] Export ConcurrencyLimit decorator from `packages/async-utils/src/nestjs/decorators/index.ts`

**Checkpoint**: @ConcurrencyLimit 데코레이터가 독립적으로 동작 가능

---

## Phase 6: User Story 4 - 전역 모듈 설정 (Priority: P2)

**Goal**: AsyncUtilsModule.forRoot()로 전역 기본값 설정 및 DI 통합

**Independent Test**: forRoot({ defaultRetries: 5 })로 설정 후, 옵션 없는 @Retryable()이 5회 재시도하는지 확인

### Implementation for User Story 4

- [X] T027 [US4] Implement AsyncUtilsModule with forRoot() in `packages/async-utils/src/nestjs/async-utils.module.ts`
  - Use ConfigurableModuleBuilder pattern
  - Provide ASYNC_UTILS_MODULE_OPTIONS token
  - Provide ConcurrencyManagerService
  - Support isGlobal option
- [X] T028 [US4] Update all interceptors to use @Optional() for MODULE_OPTIONS injection
  - RetryableInterceptor: fallback to LIBRARY_DEFAULTS
  - TimeoutInterceptor: fallback to LIBRARY_DEFAULTS
  - ConcurrencyLimitInterceptor: fallback to LIBRARY_DEFAULTS

**Checkpoint**: forRoot()로 전역 설정이 모든 데코레이터에 적용됨

---

## Phase 7: User Story 5 - 데코레이터 조합 사용 (Priority: P2)

**Goal**: 하나의 메서드에 @Retryable, @Timeout, @ConcurrencyLimit 조합 적용

**Independent Test**: 세 데코레이터가 모두 적용된 메서드에서 ConcurrencyLimit → Retryable → Timeout 순서로 실행 확인

### Implementation for User Story 5

- [X] T029 [US5] Verify decorator execution order documentation in `packages/async-utils/src/nestjs/decorators/index.ts`
  - Add JSDoc explaining execution order: ConcurrencyLimit → Retryable → Timeout
  - Document why this order matters (queue first, retry wraps timeout)
- [X] T030 [US5] Ensure interceptors don't conflict when combined
  - Review Observable chain handling in each interceptor
  - Verify error propagation between interceptors

**Checkpoint**: 데코레이터 조합이 문서화된 순서대로 동작

---

## Phase 8: User Story 6 - 비동기 모듈 설정 (Priority: P3)

**Goal**: AsyncUtilsModule.forRootAsync()로 ConfigService 등에서 동적 설정 주입

**Independent Test**: forRootAsync({ useFactory: (config) => ... })로 환경 변수 기반 설정 확인

### Implementation for User Story 6

- [X] T031 [US6] Implement forRootAsync() in AsyncUtilsModule `packages/async-utils/src/nestjs/async-utils.module.ts`
  - Support useFactory with inject
  - Support useClass option
  - Support useExisting option
- [X] T032 [US6] Create AsyncUtilsOptionsFactory interface in `packages/async-utils/src/nestjs/interfaces/module-options.interface.ts`

**Checkpoint**: forRootAsync()로 비동기 설정 주입 가능

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 내보내기 정리, 문서화, 최종 점검

- [X] T033 Create main NestJS exports in `packages/async-utils/src/nestjs/index.ts`
  - Export AsyncUtilsModule
  - Export all decorators
  - Export all interfaces (type only)
  - Export constants
  - Export QueueTimeoutError
  - Re-export core errors (RetryError, TimeoutError, AbortError)
- [X] T034 Update root exports in `packages/async-utils/src/index.ts` to include NestJS module
- [X] T035 [P] Add TSDoc comments to all public APIs
- [X] T036 [P] Verify tree-shaking works with named exports only
- [X] T037 Run build and verify bundle size < 15KB (gzipped) for core + nestjs
- [X] T038 Validate against quickstart.md examples

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 필요 - 모든 User Story를 BLOCK
- **User Stories (Phase 3-8)**: Foundational 완료 필요
  - US1, US2, US3은 **병렬 실행 가능** [P]
  - US4는 US1, US2, US3 완료 후 (인터셉터에 @Optional() 추가)
  - US5는 US1, US2, US3 완료 후 (조합 테스트)
  - US6는 US4 완료 후 (forRoot 기반)
- **Polish (Phase 9)**: 모든 User Story 완료 후

### User Story Dependencies

```
Phase 2 (Foundation)
    │
    ├──────────────────┬──────────────────┐
    ↓                  ↓                  ↓
[US1: Retryable]  [US2: Timeout]  [US3: ConcurrencyLimit]  ← 병렬 가능 [P]
    │                  │                  │
    └──────────────────┴──────────────────┘
                       │
                       ↓
              [US4: forRoot Module]
                       │
              ┌────────┴────────┐
              ↓                 ↓
      [US5: Combination]   [US6: forRootAsync]
```

### Parallel Opportunities

**Phase 2 내 병렬:**
```
T007, T008, T009, T010 [P] - 모든 인터페이스 파일 동시 작성
```

**Phase 3, 4, 5 병렬 (가장 큰 병렬화 기회):**
```
# 3개의 핵심 데코레이터를 동시에 개발 가능
Task: "[US1] RetryableInterceptor + Retryable decorator"
Task: "[US2] TimeoutInterceptor + Timeout decorator"
Task: "[US3] ConcurrencyManagerService + ConcurrencyLimitInterceptor + ConcurrencyLimit decorator"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (CRITICAL)
3. Phase 3: User Story 1 (@Retryable) 완료
4. **STOP and VALIDATE**: @Retryable 독립 테스트
5. Deploy/demo if ready

### Recommended Full Implementation Order

1. **Setup + Foundational** → 기반 완료
2. **US1, US2, US3 병렬** → 3개 핵심 데코레이터 동시 개발
3. **US4** → 모듈 통합 (forRoot)
4. **US5** → 조합 검증
5. **US6** → 비동기 설정
6. **Polish** → 내보내기 정리, 문서화

### Test Phase (별도 진행)

TDD 없이 구현 완료 후 별도 테스트 phase에서:
- 단위 테스트: `test/unit/nestjs/`
- 통합 테스트: `test/integration/nestjs/`

---

## Notes

- [P] tasks = 다른 파일, 의존성 없음
- [Story] label = 특정 User Story에 매핑
- 각 User Story는 독립적으로 완료 및 테스트 가능
- 커밋: 각 태스크 또는 논리적 그룹 완료 후
- 검증: 각 Checkpoint에서 해당 Story 독립 테스트

---

## Task Summary

| Phase | Task Count | Parallel | Description |
|-------|-----------|----------|-------------|
| 1: Setup | 4 | 2 | 프로젝트 구조 |
| 2: Foundational | 8 | 4 | 핵심 인프라 |
| 3: US1 Retryable | 4 | 0 | 재시도 데코레이터 |
| 4: US2 Timeout | 4 | 0 | 타임아웃 데코레이터 |
| 5: US3 ConcurrencyLimit | 6 | 0 | 동시성 제한 데코레이터 |
| 6: US4 forRoot | 2 | 0 | 모듈 forRoot |
| 7: US5 Combination | 2 | 0 | 데코레이터 조합 |
| 8: US6 forRootAsync | 2 | 0 | 비동기 설정 |
| 9: Polish | 6 | 2 | 정리 및 문서화 |
| **Total** | **38** | **8** | |

**MVP Scope**: Phase 1 + 2 + 3 (16 tasks) → @Retryable 데코레이터만으로 첫 배포 가능
