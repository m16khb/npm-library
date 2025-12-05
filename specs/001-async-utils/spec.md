# Feature Specification: @npm-library/async-utils

**Feature Branch**: `001-async-utils`
**Created**: 2025-12-05
**Status**: Draft
**Input**: NestJS-Fastify 백엔드용 비동기 작업 제어 라이브러리 (retry, concurrency, timeout)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - HTTP 클라이언트 재시도 (Priority: P1)

NestJS 개발자가 외부 API 호출 실패 시 자동으로 재시도하여 일시적인 네트워크 오류에도 안정적인 서비스를 제공한다.

**Why this priority**: 외부 API 연동은 대부분의 백엔드 서비스에서 가장 빈번하게 발생하는 불안정 요소이며, 재시도 로직은 서비스 안정성의 핵심이다.

**Independent Test**: 외부 API 호출 함수에 retry 래퍼를 적용하고, 의도적으로 실패를 유발하여 재시도 동작을 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 외부 API가 일시적으로 실패하는 상황, **When** retry가 설정된 함수를 호출, **Then** 설정된 횟수만큼 재시도 후 성공하면 결과 반환
2. **Given** 지수 백오프 전략이 설정된 상황, **When** 재시도가 발생, **Then** 각 시도 간 대기 시간이 지수적으로 증가 (예: 100ms, 200ms, 400ms)
3. **Given** 선형 백오프 전략이 설정된 상황, **When** 재시도가 발생, **Then** 각 시도 간 대기 시간이 일정하게 유지 (예: 100ms, 100ms, 100ms)
4. **Given** 특정 에러 타입만 재시도하도록 필터 설정, **When** 필터에 해당하지 않는 에러 발생, **Then** 즉시 실패 처리 (재시도 없음)
5. **Given** AbortSignal이 전달된 상황, **When** 재시도 중 abort 신호 수신, **Then** 현재 시도를 취소하고 AbortError 발생
6. **Given** 모든 재시도가 실패한 상황, **When** 최대 재시도 횟수 초과, **Then** RetryError를 발생시키고 원본 에러를 체인으로 보존

---

### User Story 2 - 대량 작업 동시성 제한 (Priority: P1)

백엔드 개발자가 수천 개의 비동기 작업을 동시에 N개씩만 실행하여 서버 리소스를 효율적으로 사용하고 외부 API rate limit을 준수한다.

**Why this priority**: 대량 데이터 처리, 외부 API 호출 시 동시성 제어가 없으면 서버 과부하와 rate limit 초과가 발생하여 서비스 장애로 이어진다.

**Independent Test**: 100개의 비동기 작업을 동시 실행 제한 5로 설정하고, 실제로 동시에 5개 이하만 실행되는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 최대 동시 실행 개수가 5로 설정된 상황, **When** 100개의 작업을 제출, **Then** 동시에 최대 5개만 실행되고 나머지는 큐에서 대기
2. **Given** 큐에 대기 중인 작업이 있는 상황, **When** 실행 중인 작업이 완료, **Then** 대기 중인 다음 작업이 즉시 시작
3. **Given** 우선순위가 설정된 작업들이 있는 상황, **When** 새 작업 슬롯이 열림, **Then** 높은 우선순위 작업이 먼저 실행
4. **Given** 현재 동시성이 10인 상황, **When** 동시성을 5로 동적 조정, **Then** 실행 중인 10개 작업은 완료까지 유지되고 새 작업은 5개 제한 적용
5. **Given** 작업이 실행 중인 상황, **When** 활성/대기 작업 수 조회, **Then** 정확한 활성 작업 수와 대기 작업 수 반환

---

### User Story 3 - NestJS 통합 (Priority: P1)

NestJS 개발자가 데코레이터와 모듈로 쉽게 통합하여 기존 NestJS 패턴과 일관된 방식으로 비동기 유틸리티를 사용한다.

**Why this priority**: NestJS 생태계와의 원활한 통합은 라이브러리 채택의 핵심 요소이며, 데코레이터 기반 API는 NestJS 개발자에게 친숙한 경험을 제공한다.

**Independent Test**: NestJS TestingModule에서 데코레이터를 적용한 서비스를 생성하고, 해당 기능이 올바르게 동작하는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** `@Retryable()` 데코레이터가 메서드에 적용된 상황, **When** 해당 메서드 실행 실패, **Then** 설정에 따라 자동 재시도 수행
2. **Given** `@Timeout()` 데코레이터가 적용된 상황, **When** 메서드 실행이 타임아웃 초과, **Then** TimeoutError 발생
3. **Given** `@ConcurrencyLimit()` 데코레이터가 적용된 상황, **When** 동시에 여러 호출 발생, **Then** 설정된 동시성 제한 준수
4. **Given** `AsyncUtilsModule.forRoot(config)`가 설정된 상황, **When** 애플리케이션 시작, **Then** 전역 설정이 모든 데코레이터에 적용
5. **Given** `AsyncUtilsModule.forRootAsync()`가 ConfigService와 연동된 상황, **When** 환경 변수 기반 설정 로드, **Then** 동적 설정이 올바르게 적용
6. **Given** RetryInterceptor가 컨트롤러에 적용된 상황, **When** 컨트롤러 메서드 실패, **Then** 인터셉터가 재시도 로직 수행

---

### User Story 4 - 비동기 작업 타임아웃 (Priority: P2)

개발자가 비동기 작업에 타임아웃을 적용하여 무한 대기 상황을 방지하고 graceful하게 실패 처리한다.

**Why this priority**: 타임아웃은 시스템 안정성에 중요하지만, retry와 concurrency가 먼저 구현되어야 통합 사용이 가능하다.

**Independent Test**: 의도적으로 지연되는 비동기 함수에 타임아웃을 적용하고, 제한 시간 초과 시 에러 발생을 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 3초 타임아웃이 설정된 상황, **When** 작업이 5초 소요, **Then** 3초 후 TimeoutError 발생
2. **Given** 폴백 값이 설정된 상황, **When** 타임아웃 발생, **Then** 에러 대신 폴백 값 반환
3. **Given** AbortController가 제공된 상황, **When** abort() 호출, **Then** 타임아웃 타이머 취소 및 리소스 정리
4. **Given** cleanup 함수가 제공된 상황, **When** 타임아웃 발생, **Then** cleanup 함수 호출 후 에러 발생

---

### User Story 5 - 지연 및 대기 (Priority: P2)

개발자가 안전하고 취소 가능한 대기 함수를 사용하여 비동기 흐름 제어와 폴링 로직을 구현한다.

**Why this priority**: 단순 setTimeout 대신 안전한 대기 함수가 필요하며, 취소 가능한 대기는 리소스 정리에 필수적이다.

**Independent Test**: wait 함수로 대기 후 시간이 정확히 경과했는지, abort 시 즉시 취소되는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** wait(1000)이 호출된 상황, **When** 1초가 경과, **Then** Promise가 resolve되고 다음 코드 실행
2. **Given** wait에 AbortSignal이 전달된 상황, **When** abort() 호출, **Then** 즉시 AbortError 발생 및 타이머 정리
3. **Given** waitUntil(condition)이 호출된 상황, **When** condition이 true 반환, **Then** 즉시 resolve
4. **Given** waitUntil에 timeout 옵션이 설정된 상황, **When** timeout 초과, **Then** 타임아웃 에러 발생
5. **Given** waitFor(count, ms, callback)이 호출된 상황, **When** 실행 완료, **Then** callback이 count번 호출되고 각 호출 간 ms만큼 대기
6. **Given** wait(0)이 호출된 상황, **When** 즉시 실행, **Then** 마이크로태스크 큐에서 resolve (동기적으로 완료되지 않음)

---

### User Story 6 - 통합 사용 (Priority: P2)

개발자가 retry + timeout + concurrency를 조합하여 복잡한 비동기 워크플로우를 안정적으로 처리한다.

**Why this priority**: 개별 기능이 완성된 후 조합하여 사용하는 고급 시나리오이다.

**Independent Test**: 타임아웃이 설정된 재시도 작업을 동시성 제한 내에서 실행하고, 각 레이어가 올바르게 동작하는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** retry + timeout 조합이 설정된 상황, **When** 각 시도가 타임아웃 이내 완료, **Then** 정상 결과 반환
2. **Given** retry + timeout 조합이 설정된 상황, **When** 한 시도가 타임아웃 초과, **Then** 해당 시도만 실패하고 다음 시도 진행
3. **Given** concurrency + retry 조합이 설정된 상황, **When** 동시성 제한 내에서 재시도 발생, **Then** 재시도도 동시성 제한 준수
4. **Given** 전체 작업에 AbortSignal이 전달된 상황, **When** abort 신호 발생, **Then** 모든 레이어(retry, timeout, concurrency)에 취소 전파

---

### Edge Cases

- **동시성 0 설정**: 동시성을 0으로 설정하면 에러 발생 (최소값 1)
- **재시도 횟수 0**: 재시도 없이 1회만 시도 후 실패 시 즉시 에러 발생
- **타임아웃 0ms**: 즉시 TimeoutError 발생 (동기적으로 타임아웃 처리)
- **이미 abort된 signal**: 즉시 AbortError 발생 (작업 시작 전 검사)
- **메모리 누수 방지**: 작업 취소 시 100ms 이내에 모든 타이머와 리스너 정리
- **재시도 중 concurrency 변경**: 현재 실행 중인 재시도는 영향 없음, 새 작업부터 적용
- **순환 참조**: 지원됨 - 각 retry 레이어가 독립적으로 재시도 수행

## Requirements *(mandatory)*

### Functional Requirements

#### Core 모듈 (NestJS 의존성 없음)

- **FR-001**: 시스템은 retry 함수를 제공하여 실패한 비동기 작업을 설정된 횟수만큼 자동 재시도 해야 한다 (기본값: 3회 재시도, 총 4회 시도)
- **FR-002**: 시스템은 지수 백오프(exponential backoff) 전략을 기본 제공해야 한다 (기본값: 100ms base, 10s max, 2x multiplier)
- **FR-003**: 시스템은 선형 백오프(linear backoff) 전략을 기본 제공해야 한다 (기본값: 1000ms 고정 지연)
- **FR-004**: 시스템은 커스텀 백오프 전략을 함수로 주입받을 수 있어야 한다
- **FR-005**: 시스템은 재시도할 에러를 필터링하는 조건 함수를 지원해야 한다
- **FR-006**: 시스템은 pLimit 함수를 제공하여 최대 동시 실행 개수를 제한해야 한다
- **FR-007**: 시스템은 우선순위 기반 실행 순서를 지원해야 한다 (0-10 범위, 숫자가 클수록 높은 우선순위, 기본값 5)
- **FR-008**: 시스템은 동적으로 동시성 제한을 조정할 수 있어야 한다
- **FR-009**: 시스템은 현재 활성 작업 수와 대기 작업 수를 조회할 수 있어야 한다
- **FR-010**: 시스템은 timeout 함수를 제공하여 Promise에 타임아웃을 적용해야 한다
- **FR-011**: 시스템은 타임아웃 시 커스텀 에러 또는 폴백 값 반환을 지원해야 한다
- **FR-012**: 시스템은 AbortSignal을 통한 작업 취소를 모든 함수에서 지원해야 한다

#### Delay 모듈

- **FR-027**: 시스템은 `wait(ms)` 함수를 제공하여 지정된 시간만큼 대기해야 한다
- **FR-028**: 시스템은 wait 함수에서 AbortSignal을 통한 취소를 지원해야 한다
- **FR-029**: 시스템은 wait 함수에서 대기 완료 시 반환할 값을 옵션으로 지원해야 한다
- **FR-030**: 시스템은 `waitUntil(condition)` 함수를 제공하여 조건이 충족될 때까지 대기해야 한다
- **FR-031**: 시스템은 waitUntil에서 폴링 간격과 타임아웃을 설정할 수 있어야 한다
- **FR-032**: 시스템은 `waitFor(count, ms, callback)` 함수를 제공하여 반복 대기를 지원해야 한다
- **FR-033**: 시스템은 wait에서 unref 옵션을 제공하여 Node.js 프로세스 종료를 막지 않도록 설정할 수 있어야 한다

#### NestJS 통합 모듈

- **FR-013**: 시스템은 `@Retryable()` 메서드 데코레이터를 제공해야 한다
- **FR-014**: 시스템은 `@Timeout()` 메서드 데코레이터를 제공해야 한다
- **FR-015**: 시스템은 `@ConcurrencyLimit()` 클래스/메서드 데코레이터를 제공해야 한다
- **FR-016**: 시스템은 `AsyncUtilsModule.forRoot()` 정적 메서드를 제공해야 한다
- **FR-017**: 시스템은 `AsyncUtilsModule.forRootAsync()` 비동기 설정을 지원해야 한다
- **FR-018**: 시스템은 `RetryInterceptor` NestJS 인터셉터를 제공해야 한다
- **FR-019**: 시스템은 `TimeoutInterceptor` NestJS 인터셉터를 제공해야 한다
- **FR-020**: 시스템은 NestJS ConfigService와 연동하여 설정을 로드할 수 있어야 한다

#### 에러 처리

- **FR-021**: 시스템은 모든 재시도 실패 시 `RetryError`를 발생시켜야 한다
- **FR-022**: 시스템은 타임아웃 발생 시 `TimeoutError`를 발생시켜야 한다
- **FR-023**: 시스템은 사용자 취소 시 `AbortError`를 발생시켜야 한다
- **FR-024**: 모든 에러는 원본 에러를 cause 속성으로 체인 보존해야 한다

#### 옵저버빌리티

- **FR-025**: 시스템은 재시도/타임아웃 이벤트 훅을 옵션 기반 콜백으로 제공해야 한다 (onRetry, onTimeout 함수 전달)
- **FR-026**: 시스템은 메트릭 수집을 위한 콜백 인터페이스를 제공해야 한다 (onSuccess, onError 포함)

### Key Entities

- **RetryOptions**: 재시도 설정 (횟수, 백오프 전략, 필터, signal)
- **TimeoutOptions**: 타임아웃 설정 (시간, 폴백 값, cleanup 함수)
- **LimitOptions**: 동시성 제한 설정 (최대 동시 실행 수, 우선순위)
- **LimitFunction**: pLimit이 반환하는 함수 인스턴스 (상태 조회, 동시성 조정 메서드)
- **WaitOptions**: 대기 설정 (signal, value, unref)
- **RetryError**: 모든 재시도 실패 시 발생하는 에러
- **TimeoutError**: 타임아웃 발생 시 발생하는 에러
- **AbortError**: 사용자 취소 시 발생하는 에러

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 개발자가 5분 이내에 기본 retry 기능을 프로젝트에 통합할 수 있다
- **SC-002**: 재시도 로직 적용 시 기존 코드 변경 없이 래퍼 함수로 감싸기만 하면 된다
- **SC-003**: 1,000개의 동시 작업을 제출해도 설정된 동시성 제한을 100% 준수한다
- **SC-004**: 타임아웃 설정 오차가 ±50ms 이내이다
- **SC-005**: AbortSignal로 취소 시 100ms 이내에 모든 관련 리소스가 정리된다
- **SC-006**: NestJS 데코레이터 적용 시 기존 비즈니스 로직 코드 수정이 불필요하다
- **SC-007**: Core 모듈 번들 사이즈가 5KB (minified + gzipped) 미만이다
- **SC-008**: Full 모듈 번들 사이즈가 15KB (minified + gzipped) 미만이다
- **SC-009**: 단위 테스트 커버리지가 80% 이상이다
- **SC-010**: 작업당 라이브러리 오버헤드가 1ms 미만이다

## Clarifications

### Session 2025-12-05

- Q: 지수 백오프 기본 파라미터는? → A: 업계 표준 (100ms base, 10s max, 2x multiplier)
- Q: 기본 재시도 횟수는? → A: 3회 재시도 (총 4회 시도)
- Q: 선형 백오프 기본 지연 시간은? → A: 1000ms 고정 지연
- Q: 우선순위 값 범위와 기본값은? → A: 숫자가 클수록 높은 우선순위 (0-10, 기본 5)
- Q: 옵저버빌리티 이벤트 훅 방식은? → A: 옵션 기반 콜백 (onRetry, onTimeout 함수 전달)
- Q: 재시도 횟수 0일 때 동작은? → A: 재시도 없이 1회만 시도, 실패 시 즉시 에러
- Q: 타임아웃 0ms일 때 동작은? → A: 즉시 TimeoutError 발생
- Q: 순환 참조(retry 안에서 retry)는? → A: 지원됨, 각 레이어가 독립적으로 동작

## Assumptions

- ESM only 환경을 가정하며 CommonJS는 지원하지 않는다
- TypeScript 5.7+ 환경에서 최신 데코레이터 문법을 사용한다
- Node.js 20+ 런타임을 가정한다
- NestJS 10+를 peerDependency로 가정한다
- Core 모듈은 런타임 의존성이 없다 (Zero Runtime Dependency)
- 재시도 횟수 0은 "재시도 없이 1회만 시도"를 의미한다
- 동시성 제한 1 미만은 에러로 처리한다
- 이미 abort된 signal이 전달되면 즉시 AbortError를 발생시킨다

## Out of Scope

- CommonJS 지원
- Node.js 20 미만 버전 지원
- TypeScript 5.7 미만 버전 지원
- 브라우저 환경 지원 (Node.js 전용)
- 분산 환경에서의 동시성 제어 (단일 프로세스 내에서만 동작)
- 자동 circuit breaker 패턴 (별도 라이브러리 영역)
- OpenTelemetry 자동 통합 (훅을 통한 수동 통합만 제공)
