# Feature Specification: NestJS Traceable

**Feature Branch**: `003-nestjs-traceable`
**Created**: 2025-12-05
**Status**: Draft
**Updated**: 2025-12-05 (CLS 통합 지원 추가)
**Input**: NestJS 백엔드 애플리케이션에서 다양한 통신 채널(HTTP, gRPC, Cron, BullMQ)을 통해 요청을 추적하기 위한 traceId 기반 분산 추적 라이브러리

## Clarifications

### Session 2025-12-05

- Q: 추적 시스템 오류 발생 시 요청 처리 정책? → A: Silent Continue - 추적 없이 요청 처리 계속, 내부 경고 로그만 출력
- Q: 외부 traceId 형식 검증 수준? → A: Lenient - 비어있지 않은 문자열이면 허용, 길이 제한(128자)만 적용
- Q: 추적 샘플링 지원 여부? → A: No Sampling - 모든 요청 100% 추적, 샘플링 기능 없음 (단순성 우선)
- Q: CLS(Continuation Local Storage) 구현 방식 선택? → A: 두 가지 방식 모두 지원
  - **AsyncLocalStorage** (기본): Node.js 내장 API, Zero dependency
  - **nestjs-cls**: 추가 기능 필요 시 선택적 사용

## User Scenarios & Testing *(mandatory)*

### User Story 1 - HTTP 요청 추적 (Priority: P1)

백엔드 개발자가 HTTP 요청의 전체 처리 흐름을 단일 traceId로 추적하여 디버깅 및 모니터링을 수행한다.

**Why this priority**: HTTP는 가장 일반적인 진입점이며, 분산 추적의 핵심 가치를 즉시 제공한다. 이 기능만으로도 대부분의 디버깅 시나리오를 해결할 수 있다.

**Independent Test**: HTTP 요청을 보내고 응답 헤더와 로그에서 동일한 traceId를 확인하여 전체 요청 흐름 추적이 가능함을 검증한다.

**Acceptance Scenarios**:

1. **Given** HTTP 요청이 X-Trace-Id 헤더 없이 도착, **When** 컨트롤러가 요청을 처리, **Then** 시스템이 새로운 traceId를 생성하고 모든 관련 로그에 동일한 traceId가 포함된다
2. **Given** HTTP 요청이 X-Trace-Id 헤더와 함께 도착, **When** 컨트롤러가 요청을 처리, **Then** 시스템이 전달받은 traceId를 사용하고 응답 헤더에 동일한 traceId를 반환한다
3. **Given** HTTP 요청 처리 중 여러 서비스 메서드 호출, **When** 각 메서드에서 로그 출력, **Then** 모든 로그에 동일한 traceId와 각각 다른 spanId가 포함된다

---

### User Story 2 - 로깅 통합 (Priority: P1)

백엔드 개발자가 기존 로거에 traceId/spanId를 자동으로 주입하여 구조화된 로그를 생성한다.

**Why this priority**: 로깅은 모든 통신 채널에서 공통으로 사용되며, traceId 없는 로그는 분산 추적의 가치를 제공하지 못한다.

**Independent Test**: 로거 어댑터를 설정하고 로그 출력 시 traceId/spanId가 자동 포함되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** TraceContext가 활성화된 상태, **When** 애플리케이션 로거로 메시지 출력, **Then** 로그에 현재 traceId와 spanId가 자동 포함된다
2. **Given** TraceContext가 없는 상태, **When** 애플리케이션 로거로 메시지 출력, **Then** 로그에 traceId/spanId 필드가 없거나 빈 값으로 출력된다
3. **Given** 커스텀 로거 어댑터 설정, **When** 로그 출력, **Then** 어댑터가 제공하는 형식에 맞게 traceId/spanId가 포함된다

---

### User Story 3 - Span 기반 중첩 추적 (Priority: P2)

백엔드 개발자가 복잡한 비즈니스 로직 내 개별 작업 단위를 span으로 구분하여 상세한 실행 흐름을 파악한다.

**Why this priority**: span 기반 추적은 성능 병목 식별과 복잡한 로직 디버깅에 필수적이나, 기본 traceId 추적이 먼저 동작해야 한다.

**Independent Test**: 중첩된 메서드 호출에서 각각 다른 spanId가 생성되고 parent-child 관계가 유지되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 부모 span이 활성화된 상태, **When** 새로운 span을 시작, **Then** 자식 span이 생성되고 parentSpanId가 부모 span의 spanId와 일치한다
2. **Given** 중첩된 span 구조 (A → B → C), **When** 각 span에서 로그 출력, **Then** 모든 로그에 동일한 traceId와 각각의 spanId가 포함되며 parent-child 관계가 추적된다
3. **Given** span이 시작된 상태, **When** span을 종료, **Then** 컨텍스트가 부모 span으로 복원된다

---

### User Story 4 - BullMQ Job 추적 (Priority: P2)

백엔드 개발자가 비동기 작업 큐의 job 처리 흐름을 원본 요청과 연결하여 추적한다.

**Why this priority**: 비동기 처리는 현대 백엔드의 핵심 패턴이며, job과 원본 요청의 연결은 디버깅에 중요하다.

**Independent Test**: HTTP 요청에서 생성된 job의 처리 로그에서 원본 traceId를 확인한다.

**Acceptance Scenarios**:

1. **Given** TraceContext가 활성화된 상태에서 job 생성, **When** job을 큐에 추가, **Then** job 데이터에 현재 traceId가 포함된다
2. **Given** traceId가 포함된 job, **When** Processor가 job을 처리, **Then** job의 traceId가 새로운 TraceContext로 복원되어 처리 로그에 포함된다
3. **Given** traceId 없이 생성된 job, **When** Processor가 job을 처리, **Then** 새로운 traceId가 자동 생성된다

---

### User Story 5 - gRPC 서비스 추적 (Priority: P3)

백엔드 개발자가 gRPC 서비스 간 호출에서 traceId를 전파하여 마이크로서비스 전체를 추적한다.

**Why this priority**: gRPC는 마이크로서비스 환경에서 중요하나, HTTP보다 사용 빈도가 낮다.

**Independent Test**: gRPC 클라이언트 호출 시 metadata에 traceId가 포함되고, 서버에서 이를 수신하여 사용하는지 확인한다.

**Acceptance Scenarios**:

1. **Given** gRPC 요청이 trace-id metadata와 함께 도착, **When** 서비스가 요청을 처리, **Then** 전달받은 traceId로 TraceContext가 초기화된다
2. **Given** TraceContext가 활성화된 상태, **When** gRPC 클라이언트로 다른 서비스 호출, **Then** 요청 metadata에 현재 traceId가 자동 포함된다
3. **Given** gRPC 요청이 trace-id metadata 없이 도착, **When** 서비스가 요청을 처리, **Then** 새로운 traceId가 자동 생성된다

---

### User Story 6 - Cron Job 추적 (Priority: P3)

백엔드 개발자가 스케줄된 작업의 실행을 독립적인 trace로 추적한다.

**Why this priority**: Cron은 외부 요청이 아닌 내부 스케줄이므로 traceId 전파가 아닌 생성만 필요하다.

**Independent Test**: Cron 메서드 실행 시 새로운 traceId가 생성되어 로그에 포함되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** @Cron 데코레이터가 적용된 메서드, **When** 스케줄에 따라 실행, **Then** 새로운 traceId가 자동 생성되고 실행 로그에 포함된다
2. **Given** Cron job 실행 중 다른 서비스 호출, **When** 해당 서비스에서 로그 출력, **Then** Cron job의 traceId가 전파되어 동일한 traceId가 사용된다

---

### User Story 7 - 외부 HTTP 호출 계측 (Priority: P3)

백엔드 개발자가 외부 API 호출 시 traceId를 자동으로 전파하여 서비스 간 추적 연속성을 유지한다.

**Why this priority**: 외부 호출 계측은 분산 시스템에서 중요하나, 내부 추적이 먼저 완성되어야 한다.

**Independent Test**: HttpService로 외부 API 호출 시 요청 헤더에 X-Trace-Id가 포함되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** TraceContext가 활성화된 상태, **When** HttpService로 외부 API 호출, **Then** 요청 헤더에 X-Trace-Id가 자동 포함된다
2. **Given** TraceContext가 없는 상태, **When** HttpService로 외부 API 호출, **Then** X-Trace-Id 헤더가 추가되지 않는다

---

### Edge Cases

- traceId 형식이 유효하지 않은 헤더가 전달되면 어떻게 처리하는가? → Lenient 검증 정책: 비어있지 않고 128자 이하면 허용, 그 외의 경우 새로운 traceId 생성
- AsyncLocalStorage 컨텍스트가 손실되는 경우(예: 네이티브 addon 호출) 어떻게 대응하는가? → graceful degradation으로 traceId 없이 동작
- 추적 시스템 자체에 오류 발생 시(초기화 실패, traceId 생성 실패 등) 어떻게 처리하는가? → Silent Continue 정책: 추적 없이 요청 처리 계속, 내부 경고 로그만 출력 (서비스 가용성 우선)
- 매우 깊은 span 중첩(100+ depth)이 발생하면 어떻게 처리하는가? → 기본값 100, `maxSpanDepth` 옵션으로 설정 가능. 초과 시 새 span 생성 무시 + 경고 로그 출력
- 동시에 수천 개의 요청이 처리될 때 컨텍스트 격리가 보장되는가? → AsyncLocalStorage의 격리 특성에 의존
- span 종료 없이 컨텍스트가 해제되면 어떻게 처리하는가? → 자동 정리 메커니즘: 요청 완료 시 미종료 span을 'error' 상태로 자동 종료, 경고 로그 출력. `autoCleanupSpans` 옵션으로 비활성화 가능 (기본값: true)

## Requirements *(mandatory)*

### Functional Requirements

#### 핵심 기능
- **FR-001**: 시스템 MUST 진입점(HTTP, gRPC, Cron, BullMQ)에서 traceId를 자동 생성한다
- **FR-002**: 시스템 MUST 외부에서 전달된 traceId를 수신하여 컨텍스트에 설정한다
- **FR-003**: 시스템 MUST CLS(Continuation Local Storage)를 사용하여 요청 컨텍스트를 전파한다
  - 기본 구현: Node.js 내장 AsyncLocalStorage
  - 선택 구현: nestjs-cls 라이브러리
- **FR-003-1**: 시스템 MUST CLS 구현 방식을 선택적으로 지원해야 한다
- **FR-004**: 시스템 MUST 중첩 호출 시 spanId를 생성하고 parent-child 관계를 추적한다
- **FR-005**: 시스템 MUST 동일 요청 내 모든 코드에서 현재 traceId에 접근할 수 있어야 한다

#### HTTP 지원
- **FR-006**: 시스템 MUST HTTP 요청의 X-Trace-Id 헤더에서 traceId를 추출한다
- **FR-007**: 시스템 MUST HTTP 응답에 X-Trace-Id 헤더를 포함한다
- **FR-008**: 시스템 MUST HttpService 요청에 X-Trace-Id 헤더를 자동 주입한다

#### gRPC 지원
- **FR-009**: 시스템 MUST gRPC metadata의 trace-id에서 traceId를 추출한다
- **FR-010**: 시스템 MUST gRPC 클라이언트 호출 시 metadata에 trace-id를 자동 추가한다

#### BullMQ 지원
- **FR-011**: 시스템 MUST job 생성 시 현재 traceId를 job 데이터에 포함한다
- **FR-012**: 시스템 MUST job 처리 시 job 데이터의 traceId로 컨텍스트를 초기화한다

#### Cron 지원
- **FR-013**: 시스템 MUST Cron 메서드 실행 시 새로운 traceId를 자동 생성한다

#### 로깅 통합
- **FR-014**: 시스템 MUST 로그 출력 시 현재 traceId/spanId를 자동 주입하는 기능을 제공한다
- **FR-015**: 시스템 MUST 커스텀 로거 어댑터를 지원한다 (Winston, Pino, Bunyan 등)
- **FR-016**: 시스템 MUST 구조화된 로그 포맷(JSON)을 지원한다

#### API 인터페이스
- **FR-017**: 시스템 MUST 데코레이터 기반 API를 제공한다 (@Traceable, @Trace)
- **FR-018**: 시스템 MUST 프로그래매틱 API를 제공한다 (TraceContext.getCurrentTraceId(), TraceContext.startSpan())
- **FR-019**: 시스템 MUST NestJS 모듈 형태로 제공되어 forRoot/forRootAsync 패턴을 지원한다

#### 설정
- **FR-020**: 시스템 MUST traceId 헤더명을 설정 가능해야 한다 (기본값: X-Trace-Id)
- **FR-021**: 시스템 MUST traceId 생성 전략을 커스터마이징할 수 있어야 한다

### Key Entities

- **TraceContext**: 현재 추적 상태를 나타내는 컨텍스트. traceId, spanId, parentSpanId 포함
- **Span**: 개별 작업 단위. 시작/종료 시간, 작업명, 상위 span 참조 포함
- **TraceId**: 요청 전체를 식별하는 고유 식별자. 서비스 간 전파됨
- **SpanId**: 개별 작업을 식별하는 고유 식별자. traceId 내에서 유일
- **CLS Adapter**: Continuation Local Storage 구현을 추상화하는 인터페이스
  - AsyncLocalStorageAdapter: Node.js 내장 API 사용
  - NestjsClsAdapter: nestjs-cls 라이브러리 사용

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 단일 요청의 모든 로그에서 동일한 traceId를 확인할 수 있다 (100% 일관성)
- **SC-002**: 서비스 간 호출(HTTP, gRPC) 시 traceId 연속성이 유지된다 (100% 전파율)
- **SC-003**: traceId 처리로 인한 성능 오버헤드가 요청당 1ms 미만이다
- **SC-004**: 동시 요청 1000개 처리 시 컨텍스트 격리가 100% 보장된다
- **SC-005**: 개발자가 5분 이내에 기본 설정을 완료하고 첫 추적 로그를 확인할 수 있다
- **SC-006**: 라이브러리가 NestJS 외 추가 런타임 의존성 없이 동작한다 (Zero external dependency)
  - AsyncLocalStorage 구현: Zero dependency
  - nestjs-cls 구현: 선택적 의존성 (peerDependency)
- **SC-007**: Core 번들 사이즈가 5KB (gzipped) 미만이다
- **SC-008**: Core + NestJS adapter 번들 사이즈가 10KB (gzipped) 미만이다

## Assumptions

- Node.js 20+ 환경에서 AsyncLocalStorage가 안정적으로 동작한다고 가정
- 사용자가 NestJS 10 또는 11 버전을 사용한다고 가정
- traceId 형식은 UUID v4를 기본값으로 사용 (커스터마이징 가능), 외부 traceId는 Lenient 검증(비어있지 않은 128자 이하 문자열 허용)
- HTTP 헤더명은 X-Trace-Id를 표준으로 사용 (OpenTelemetry traceparent 형식은 별도 확장으로 고려)
- 로거 어댑터는 가장 널리 사용되는 Winston, Pino, Bunyan을 우선 지원
- gRPC metadata key는 trace-id를 사용 (OpenTelemetry 호환)
- BullMQ job data에서 traceId를 저장하는 키는 `_traceId`를 사용 (충돌 방지)

## Constraints

- Zero dependency: NestJS core packages(@nestjs/common, @nestjs/core) 외 추가 의존성 없음
  - 단, nestjs-cls는 선택적 peerDependency로 허용
- TypeScript 5.7+ (ES2022) 타겟
- NestJS 10.x / 11.x 호환성 유지
- CLS 구현 방식은 런타임에 선택 가능해야 함
- Node.js 20+ (AsyncLocalStorage 네이티브 지원)
- No Sampling: 모든 요청 100% 추적 (샘플링 기능 미지원, 단순성 우선)
