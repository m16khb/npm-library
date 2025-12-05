# Implementation Plan: NestJS 비동기 유틸리티 데코레이터 통합

**Branch**: `002-nestjs-async-decorators` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-nestjs-async-decorators/spec.md`

## Summary

NestJS 백엔드 개발자가 기존 비즈니스 로직을 수정하지 않고 `@Retryable()`, `@Timeout()`, `@ConcurrencyLimit()` 메서드 데코레이터만 추가하여 재시도, 타임아웃, 동시성 제한 기능을 적용할 수 있는 NestJS 통합 모듈을 구현한다.

기존 `packages/async-utils/src/core/`의 `retry`, `pLimit`, `pTimeout` 함수를 NestJS 인터셉터와 데코레이터로 래핑하여 선언적 비동기 제어를 가능하게 한다.

## Technical Context

**Language/Version**: TypeScript 5.7+ (ES2022, strict mode)
**Runtime**: Node.js 20+ (ESM only)
**Primary Dependencies**:
- `@nestjs/common` ^10.0.0 || ^11.0.0 (peerDependency)
- 기존 core 함수들: retry, pLimit, pTimeout, AbortError, TimeoutError, RetryError

**Storage**: N/A (in-memory state only - 동시성 카운터, 큐)
**Testing**: Vitest 2.x + @nestjs/testing
**Target Platform**: Node.js 20+ (ESM)
**Project Type**: Library (monorepo package)
**Performance Goals**:
- 데코레이터 오버헤드 < 1ms per call
- 동시 1000개 요청 정확한 동시성 제한

**Constraints**:
- NestJS 통합 추가 후 전체 번들 < 15KB (gzipped)
- Tree-shaking 지원 (named exports only)
- Zero runtime dependencies (NestJS는 peerDep)
- 단일 프로세스 환경만 지원 (분산 환경 제외)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 단일 책임 원칙 (SRP) ✅ PASS
- 이 통합은 기존 `@npm-library/async-utils` 패키지에 NestJS 어댑터를 추가하는 것
- 패키지는 "비동기 유틸리티"라는 단일 책임 유지
- NestJS 통합은 `/nestjs/` 하위 디렉토리로 분리되어 별도 import 가능

### II. 개방-폐쇄 원칙 (OCP) ✅ PASS
- 기존 core 함수들(retry, pLimit, pTimeout)을 수정하지 않고 확장
- 데코레이터는 core 함수를 래핑하여 NestJS 통합 제공
- 커스텀 재시도 전략, 필터 등 확장 포인트 유지

### III. 리스코프 치환 원칙 (LSP) ✅ PASS
- NestJS 서비스는 core 인터페이스 계약 준수
- 데코레이터 적용 여부와 관계없이 메서드 시그니처 동일

### IV. 인터페이스 분리 원칙 (ISP) ✅ PASS
- 세 가지 독립적 데코레이터: @Retryable, @Timeout, @ConcurrencyLimit
- 각 데코레이터는 필요한 옵션만 받음
- 전역 설정과 개별 옵션 분리

### V. 의존성 역전 원칙 (DIP) ✅ PASS
- NestJS DI 토큰(ASYNC_UTILS_MODULE_OPTIONS)으로 설정 주입
- forRoot/forRootAsync 패턴 적용
- 인터셉터는 옵션 Provider에만 의존

### 아키텍처 패턴 준수 ✅ PASS
- Framework-agnostic core + NestJS adapter 패턴 적용
- `/src/core/` - 순수 로직 (기존)
- `/src/nestjs/` - NestJS 어댑터 (신규)

### 품질 기준 준수 계획
- **테스트**: 단위 테스트 80%+, 통합 테스트 70%+ 목표
- **번들**: Core + NestJS adapter < 15KB (gzipped)
- **Tree-shaking**: named exports only, sideEffects: false

### 의존성 정책 준수 ✅ PASS
- `@nestjs/common` ^10.0.0 || ^11.0.0 as peerDependency
- Zero runtime dependencies 추가 없음
- 기존 core 모듈만 내부 의존

## Project Structure

### Documentation (this feature)

```text
specs/002-nestjs-async-decorators/
├── plan.md              # 이 파일 (/speckit.plan 출력)
├── research.md          # Phase 0 출력 - 리서치 결과
├── data-model.md        # Phase 1 출력 - 데이터 모델
├── quickstart.md        # Phase 1 출력 - 빠른 시작 가이드
├── contracts/           # Phase 1 출력 - API 계약
└── tasks.md             # Phase 2 출력 (/speckit.tasks 명령으로 생성)
```

### Source Code (repository root)

```text
packages/async-utils/
├── src/
│   ├── core/                           # 기존 - Framework-agnostic 순수 로직
│   │   ├── errors/                     # AbortError, RetryError, TimeoutError
│   │   ├── retry/                      # retry(), retryWithState(), strategies
│   │   ├── concurrency/                # pLimit(), PriorityQueue
│   │   ├── timeout/                    # pTimeout()
│   │   ├── delay/                      # wait(), waitUntil()
│   │   └── utils/                      # abort-utils
│   │
│   ├── nestjs/                         # 신규 - NestJS 어댑터 계층
│   │   ├── constants.ts                # DI 토큰 정의
│   │   ├── interfaces/                 # 옵션 인터페이스
│   │   │   ├── module-options.interface.ts
│   │   │   ├── retryable-options.interface.ts
│   │   │   ├── timeout-options.interface.ts
│   │   │   └── concurrency-options.interface.ts
│   │   ├── decorators/                 # 메서드 데코레이터
│   │   │   ├── retryable.decorator.ts
│   │   │   ├── timeout.decorator.ts
│   │   │   └── concurrency-limit.decorator.ts
│   │   ├── interceptors/               # NestJS 인터셉터
│   │   │   ├── retryable.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── concurrency-limit.interceptor.ts
│   │   ├── services/                   # 내부 서비스
│   │   │   └── concurrency-manager.service.ts
│   │   ├── async-utils.module.ts       # 메인 모듈 (forRoot/forRootAsync)
│   │   └── index.ts                    # NestJS exports
│   │
│   └── index.ts                        # 통합 exports
│
├── test/
│   ├── unit/
│   │   └── nestjs/                     # NestJS 단위 테스트
│   │       ├── decorators/
│   │       └── interceptors/
│   └── integration/
│       └── nestjs/                     # NestJS 통합 테스트
│           ├── retryable.integration.test.ts
│           ├── timeout.integration.test.ts
│           ├── concurrency-limit.integration.test.ts
│           └── combined.integration.test.ts
│
└── package.json                        # peerDependencies 업데이트
```

**Structure Decision**: 기존 monorepo 패키지 구조 내 `/nestjs/` 하위 디렉토리에 NestJS 어댑터 계층 추가. 헌법의 "Framework-agnostic core + NestJS adapter" 패턴을 따름.

## Complexity Tracking

> Constitution Check에 위반 사항 없음 - 모든 원칙 준수

| 항목 | 상태 | 비고 |
|------|------|------|
| SOLID 원칙 | ✅ 준수 | 기존 core 확장, 어댑터 패턴 적용 |
| 아키텍처 패턴 | ✅ 준수 | core + nestjs 계층 분리 |
| 품질 기준 | 📋 계획됨 | 80%+ 커버리지 목표 |
| 의존성 정책 | ✅ 준수 | peerDependency로 NestJS 참조 |

---

## Phase 0: Research Summary

📄 **상세 문서**: [research.md](./research.md)

### 핵심 기술 결정

| 영역 | 결정 | 근거 |
|------|------|------|
| 데코레이터 생성 | `applyDecorators` + `SetMetadata` + `UseInterceptors` | NestJS 공식 권장 패턴 |
| 메타데이터 접근 | `Reflector.getAllAndOverride` | 메서드 > 클래스 > 전역 우선순위 자동 처리 |
| 데코레이터 실행 순서 | ConcurrencyLimit → Retryable → Timeout | 의미적으로 올바른 순서 (대기열 → 재시도 → 개별 타임아웃) |
| 상태 관리 | `Map<string, LimitFunction>` | 메서드별 독립적 동시성 제어 |
| 모듈 패턴 | `ConfigurableModuleBuilder` (NestJS 9+) | 보일러플레이트 감소, 타입 안전성 |
| 로깅 | 옵션 기반 NestJS Logger | 전역/데코레이터별 선택적 활성화 |
| Core 통합 | 인터셉터에서 직접 호출 | 코드 재사용, 동작 일관성 |
| 에러 처리 | Core 에러 + HttpException 래핑 | 의미 보존 + NestJS 호환 |

---

## Phase 1: Design Summary

### 생성된 아티팩트

| 파일 | 설명 |
|------|------|
| [data-model.md](./data-model.md) | 핵심 인터페이스, 타입 정의, 엔티티 관계도 |
| [contracts/api-contract.ts](./contracts/api-contract.ts) | TypeScript Public API 계약 |
| [quickstart.md](./quickstart.md) | 5분 빠른 시작 가이드 |

### 핵심 인터페이스

```typescript
// 모듈 옵션
interface AsyncUtilsModuleOptions {
  defaultRetries?: number;      // 기본: 3
  defaultTimeout?: number;      // 기본: 30000ms
  defaultConcurrency?: number;  // 기본: 10
  enableLogging?: boolean;      // 기본: false
}

// 데코레이터 옵션
interface RetryableOptions { retries?, strategy?, retryWhen?, retryOn?, enableLogging?, onRetry? }
interface TimeoutOptions { milliseconds?, message?, enableLogging?, onTimeout? }
interface ConcurrencyLimitOptions { limit?, queueTimeout?, enableLogging? }
```

### 데코레이터 사용 예시

```typescript
@ConcurrencyLimit(5)       // 동시 5개 실행
@Retryable({ retries: 3 }) // 3회 재시도
@Timeout(5000)             // 각 시도당 5초 타임아웃
async processPayment(orderId: string): Promise<PaymentResult> {
  return this.paymentGateway.charge(orderId);
}
```

### 설정 병합 우선순위

```
데코레이터 옵션 > 모듈 전역 설정 > 라이브러리 기본값
```

---

## Phase 1 Post-Design Constitution Re-Check

### ✅ 모든 원칙 준수 확인

| 원칙 | 설계 반영 | 상태 |
|------|----------|------|
| SRP | 각 데코레이터/인터셉터가 단일 책임 | ✅ |
| OCP | Core 함수 수정 없이 NestJS 확장 | ✅ |
| LSP | 데코레이터 적용 후 메서드 시그니처 동일 | ✅ |
| ISP | 세 가지 독립적 데코레이터 분리 | ✅ |
| DIP | DI 토큰과 forRoot/forRootAsync 패턴 | ✅ |
| 아키텍처 | core/ + nestjs/ 계층 분리 유지 | ✅ |
| 품질 | 테스트 구조 설계 완료 | ✅ |
| 번들 | Tree-shaking 가능한 named exports | ✅ |

---

## Next Steps

이 계획 문서가 완료되었습니다. 다음 단계:

1. **`/speckit.tasks`** 명령을 실행하여 구현 태스크 생성
2. 생성된 `tasks.md`를 검토하고 구현 시작
3. 구현 완료 후 테스트 및 문서화
