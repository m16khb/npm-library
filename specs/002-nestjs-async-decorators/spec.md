# Feature Specification: NestJS 비동기 유틸리티 데코레이터 통합

**Feature Branch**: `002-nestjs-async-decorators`
**Created**: 2025-12-05
**Status**: Draft
**Input**: NestJS 백엔드 개발자가 기존 비즈니스 로직을 수정하지 않고 메서드 데코레이터만 추가하여 재시도, 타임아웃, 동시성 제한 기능을 적용할 수 있는 NestJS 통합 모듈

## Clarifications

### Session 2025-12-05

- Q: 데코레이터 조합 시 실행 순서는? → A: ConcurrencyLimit → Retryable → Timeout (대기열 관리 → 재시도마다 개별 타임아웃 적용)
- Q: 관찰가능성(Observability) 요구사항은? → A: 선택적 로깅 - NestJS Logger 사용 또는 커스텀 로거(LoggerService) 지원, 옵션으로 활성화/비활성화 가능
- Q: 동시성 제한(@ConcurrencyLimit) 범위는? → A: 메서드 단위 - 각 메서드마다 독립적인 동시성 카운터 (같은 클래스의 다른 메서드와 공유 안 함)
- Q: 라이브러리 기본값(전역/옵션 없을 때)은? → A: 합리적 기본값 - retries: 3, timeout: 30000ms, concurrency: 10
- Q: 동시성 대기열 타임아웃은? → A: 선택적 대기 타임아웃 - 기본 무한 대기, queueTimeout 옵션으로 대기 시간 제한 가능

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 외부 API 호출 재시도 (Priority: P1)

백엔드 개발자가 외부 결제 API를 호출하는 서비스 메서드에 `@Retryable()` 데코레이터를 추가하여, 일시적인 네트워크 오류 시 자동으로 재시도되도록 한다.

**Why this priority**: 외부 API 호출 실패는 가장 빈번한 장애 원인이며, 재시도 로직은 안정성 확보의 핵심 기능이다.

**Independent Test**: PaymentService의 processPayment 메서드에 `@Retryable({ retries: 3 })` 데코레이터를 추가하고, 외부 API가 2번 실패 후 성공하는 시나리오에서 최종적으로 결제가 완료되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 외부 API가 일시적으로 불안정한 상태, **When** `@Retryable({ retries: 3 })`가 적용된 메서드를 호출하고 첫 2번 실패 후 3번째 성공, **Then** 메서드는 성공 결과를 반환한다
2. **Given** 외부 API가 완전히 다운된 상태, **When** `@Retryable({ retries: 3 })`가 적용된 메서드를 호출하고 3번 모두 실패, **Then** 최종 실패 에러가 호출자에게 전달된다
3. **Given** 비즈니스 로직 예외(예: 잔액 부족), **When** 재시도 대상이 아닌 에러가 발생, **Then** 즉시 실패하고 재시도하지 않는다

---

### User Story 2 - 느린 메서드 타임아웃 처리 (Priority: P1)

백엔드 개발자가 데이터베이스 조회 메서드에 `@Timeout()` 데코레이터를 추가하여, 지정된 시간 내에 응답이 없으면 타임아웃 에러를 발생시킨다.

**Why this priority**: 응답 지연은 사용자 경험을 저하시키고 시스템 리소스를 점유하므로, 타임아웃 제어는 재시도와 함께 가장 중요한 기능이다.

**Independent Test**: ReportService의 generateReport 메서드에 `@Timeout(5000)` 데코레이터를 추가하고, 5초 이상 걸리는 작업에서 TimeoutError가 발생하는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 메서드 실행에 3초가 소요되는 상황, **When** `@Timeout(5000)`이 적용된 메서드를 호출, **Then** 정상적으로 결과가 반환된다
2. **Given** 메서드 실행에 10초가 소요되는 상황, **When** `@Timeout(5000)`이 적용된 메서드를 호출, **Then** 5초 후 TimeoutError가 발생한다
3. **Given** 타임아웃 발생 시, **When** 진행 중인 작업이 있으면, **Then** 해당 작업에 취소 신호(AbortSignal)가 전달된다

---

### User Story 3 - 동시 실행 수 제한 (Priority: P2)

백엔드 개발자가 외부 API 호출 메서드에 `@ConcurrencyLimit()` 데코레이터를 추가하여, 동시에 실행되는 호출 수를 제한한다.

**Why this priority**: 외부 서비스의 rate limit 준수나 시스템 리소스 보호를 위해 필요하지만, 재시도/타임아웃보다는 사용 빈도가 낮다.

**Independent Test**: ExternalApiService의 fetchData 메서드에 `@ConcurrencyLimit(3)` 데코레이터를 추가하고, 10개의 동시 요청 중 최대 3개만 동시에 실행되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** `@ConcurrencyLimit(3)`이 적용된 메서드, **When** 10개의 요청이 동시에 들어옴, **Then** 최대 3개만 동시 실행되고 나머지는 대기열에서 순차 처리된다
2. **Given** 대기 중인 요청이 있는 상태, **When** 실행 중인 요청 하나가 완료됨, **Then** 대기열의 다음 요청이 즉시 실행된다
3. **Given** 동시성 제한이 적용된 메서드, **When** 모든 요청이 완료됨, **Then** 모든 결과가 올바른 호출자에게 반환된다

---

### User Story 4 - 전역 모듈 설정 (Priority: P2)

백엔드 개발자가 AsyncUtilsModule을 앱에 등록하고 ConfigService를 통해 전역 기본값을 설정하여, 개별 데코레이터에서 옵션을 생략해도 전역 설정이 적용되도록 한다.

**Why this priority**: 전역 설정은 일관된 정책 적용과 유지보수 편의성을 위해 중요하지만, 기본 데코레이터 기능이 먼저 구현되어야 한다.

**Independent Test**: AsyncUtilsModule.forRoot()로 전역 재시도 횟수를 5회로 설정하고, 옵션 없이 `@Retryable()`을 사용했을 때 5회 재시도되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 전역 설정에서 기본 재시도 횟수가 5회로 설정됨, **When** `@Retryable()` 데코레이터를 옵션 없이 사용, **Then** 5회까지 재시도된다
2. **Given** 전역 설정에서 기본 타임아웃이 10초로 설정됨, **When** `@Timeout()` 데코레이터를 옵션 없이 사용, **Then** 10초 후 타임아웃된다
3. **Given** 전역 설정과 데코레이터 옵션이 모두 존재, **When** 데코레이터에 다른 값을 명시, **Then** 데코레이터 옵션이 전역 설정을 오버라이드한다

---

### User Story 5 - 데코레이터 조합 사용 (Priority: P2)

백엔드 개발자가 하나의 메서드에 여러 데코레이터를 조합하여 재시도 + 타임아웃 + 동시성 제한을 함께 적용한다.

**Why this priority**: 실제 운영 환경에서는 여러 제어 기능을 함께 사용하는 경우가 많으므로 조합 가능성은 필수이다.

**Independent Test**: 메서드에 `@Retryable()`, `@Timeout()`, `@ConcurrencyLimit()`을 모두 적용하고 각 기능이 독립적으로 동작하는지 확인한다.

**Acceptance Scenarios**:

1. **Given** `@Retryable({ retries: 3 })`, `@Timeout(5000)`, `@ConcurrencyLimit(2)`가 모두 적용된 메서드, **When** 첫 번째 시도에서 타임아웃 발생, **Then** 재시도가 수행된다
2. **Given** 동일 조합의 메서드, **When** 3개의 동시 요청이 들어옴, **Then** 2개만 동시 실행되고 1개는 대기한다
3. **Given** 동일 조합의 메서드, **When** 모든 재시도가 타임아웃으로 실패, **Then** 최종적으로 TimeoutError가 호출자에게 전달된다

---

### User Story 6 - 비동기 모듈 설정 (Priority: P3)

백엔드 개발자가 AsyncUtilsModule.forRootAsync()를 사용하여 ConfigService나 다른 Provider에서 동적으로 설정값을 주입한다.

**Why this priority**: 환경별 설정 분리나 외부 설정 소스 연동을 위해 필요하지만, 기본 forRoot() 기능이 먼저 구현되어야 한다.

**Independent Test**: forRootAsync()에서 useFactory로 ConfigService의 값을 주입하고, 환경 변수에 따라 다른 기본값이 적용되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** forRootAsync()로 ConfigService 주입 설정, **When** 모듈 초기화 시, **Then** ConfigService에서 읽은 값이 전역 기본값으로 적용된다
2. **Given** useClass 옵션으로 커스텀 옵션 팩토리 제공, **When** 모듈 초기화 시, **Then** 커스텀 팩토리가 생성한 옵션이 적용된다

---

### Edge Cases

- 데코레이터가 적용된 메서드가 동기 함수인 경우 어떻게 처리되는가? (비동기로 래핑)
- 재시도 중 AbortSignal로 취소 요청이 들어오면 어떻게 되는가? (즉시 중단)
- 동시성 제한 대기 중 타임아웃이 발생하면 어떻게 되는가? (대기열에서 제거 후 타임아웃 에러)
- 데코레이터가 클래스 메서드가 아닌 일반 함수에 적용되면? (컴파일 타임 또는 런타임 에러)
- 전역 설정 없이 옵션도 없이 데코레이터를 사용하면? (라이브러리 기본값 적용)
- 재시도 도중 서버가 종료되면? (진행 중인 작업은 완료 시도, 대기 중인 작업은 취소)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 `@Retryable()` 데코레이터를 제공하여 메서드 실패 시 지정된 횟수만큼 자동 재시도해야 한다
- **FR-002**: `@Retryable()` 데코레이터는 재시도 횟수, 지연 전략(고정/지수/지터), 재시도 조건(특정 에러만)을 설정할 수 있어야 한다
- **FR-003**: 시스템은 `@Timeout()` 데코레이터를 제공하여 메서드 실행 시간을 제한하고 초과 시 TimeoutError를 발생시켜야 한다
- **FR-004**: `@Timeout()` 데코레이터는 밀리초 단위의 시간 제한을 설정할 수 있어야 한다
- **FR-005**: 시스템은 `@ConcurrencyLimit()` 데코레이터를 제공하여 동일 메서드의 동시 실행 수를 제한해야 하며, 동시성 카운터는 메서드 단위로 독립적으로 관리된다 (같은 클래스의 다른 메서드와 공유하지 않음)
- **FR-006**: `@ConcurrencyLimit()` 데코레이터는 최대 동시 실행 수와 선택적 대기열 타임아웃(queueTimeout)을 설정할 수 있어야 한다 (기본: 무한 대기)
- **FR-007**: 시스템은 AsyncUtilsModule을 제공하여 NestJS 앱에 등록할 수 있어야 한다
- **FR-008**: AsyncUtilsModule.forRoot()는 전역 기본 옵션을 설정할 수 있어야 한다
- **FR-009**: AsyncUtilsModule.forRootAsync()는 비동기로 옵션을 설정할 수 있어야 한다 (useFactory, useClass, useExisting 지원)
- **FR-010**: 데코레이터 옵션은 전역 설정보다 우선 적용되어야 한다
- **FR-011**: 여러 데코레이터를 하나의 메서드에 조합하여 사용할 수 있어야 하며, 실행 순서는 ConcurrencyLimit → Retryable → Timeout이다 (대기열 관리 후, 재시도마다 개별 타임아웃 적용)
- **FR-012**: 모든 데코레이터는 기존 async-utils core 함수(retry, pLimit, pTimeout)를 내부적으로 활용해야 한다
- **FR-013**: 재시도 불가능한 에러(비즈니스 로직 예외)를 구분할 수 있는 옵션을 제공해야 한다
- **FR-014**: 타임아웃 발생 시 진행 중인 작업에 AbortSignal을 전달하여 취소를 시도해야 한다
- **FR-015**: 시스템은 NestJS Logger를 통해 재시도/타임아웃/동시성 제한 이벤트를 선택적으로 로깅할 수 있어야 한다 (전역 또는 데코레이터별 활성화/비활성화 옵션)
- **FR-016**: 시스템은 커스텀 로거를 지원해야 한다 (NestJS LoggerService 인터페이스 또는 간단한 함수 로거)
- **FR-017**: AsyncUtilsModule.forRoot()는 isGlobal 옵션을 지원하여 글로벌 모듈 여부를 설정할 수 있어야 한다 (기본값: true)

### Key Entities

- **AsyncUtilsModuleOptions**: 모듈 전역 설정 (기본 재시도 횟수, 기본 타임아웃, 기본 동시성 제한, 커스텀 로거, isGlobal)
- **RetryableOptions**: 재시도 데코레이터 옵션 (retries, strategy, retryOn, retryWhen, enableLogging, onRetry)
- **TimeoutOptions**: 타임아웃 데코레이터 옵션 (milliseconds, message, enableLogging, onTimeout)
- **ConcurrencyLimitOptions**: 동시성 제한 데코레이터 옵션 (limit, queueTimeout, enableLogging)
- **AsyncUtilsLoggerService**: 로깅 서비스 (커스텀 LoggerService 또는 loggerFn 지원)
- **ASYNC_UTILS_MODULE_OPTIONS**: 의존성 주입 토큰

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 개발자가 기존 서비스 메서드에 데코레이터 한 줄만 추가하여 재시도/타임아웃/동시성 제한 기능을 적용할 수 있다
- **SC-002**: 데코레이터 적용 후 기존 비즈니스 로직 코드 변경이 0줄이다
- **SC-003**: 전역 설정 변경 시 모든 데코레이터에 일괄 적용되어 개별 수정이 필요 없다
- **SC-004**: 동시에 1000개의 요청이 들어와도 동시성 제한이 정확히 적용된다
- **SC-005**: 재시도 횟수가 정확히 설정값만큼 수행된다 (1회 초과/미달 없음)
- **SC-006**: 타임아웃이 설정된 시간의 ±100ms 오차 내에서 발생한다
- **SC-007**: NestJS 10.x, 11.x 버전에서 정상 동작한다

## Assumptions

- 개발자는 NestJS의 데코레이터 및 모듈 시스템에 익숙하다
- 대상 메서드는 Promise를 반환하는 비동기 메서드이다 (동기 메서드는 비동기로 래핑됨)
- 단일 프로세스 환경에서만 동작하며, 분산 환경의 동시성 제어는 범위 외이다
- 기존 async-utils core 패키지의 retry, pLimit, withTimeout 함수가 안정적으로 동작한다
- ConfigService는 @nestjs/config 패키지의 표준 구현을 따른다
- 라이브러리 기본값 (전역/데코레이터 옵션 미지정 시): retries: 3, timeout: 30000ms, concurrency: 10

## Constraints

- 이미 구현된 core 함수들(retry, pLimit, withTimeout)을 재사용해야 한다 (새로 구현하지 않음)
- 분산 환경 지원 제외 (단일 프로세스 내에서만 동작)
- Rate Limiting 제외 (@nestjs/throttler 공식 패키지 사용 권장)
- CLS/트랜잭션 통합 제외 (nestjs-cls 패키지 사용 권장)
- Circuit Breaker 제외 (opossum/cockatiel 패키지 사용 권장)
- @nestjs/common ^10.0.0 || ^11.0.0을 peerDependency로 요구

## Out of Scope

- 분산 환경에서의 동시성 제어 (Redis 기반 등)
- Rate Limiting (요청 속도 제한)
- Circuit Breaker 패턴
- CLS(Continuation Local Storage) 통합
- 트랜잭션 컨텍스트 전파
- 컨트롤러/라우트 레벨 인터셉터 (서비스 메서드 데코레이터에 집중)
