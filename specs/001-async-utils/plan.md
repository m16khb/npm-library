# Implementation Plan: @npm-library/async-utils

**Branch**: `001-async-utils` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-async-utils/spec.md`

## Summary

NestJS-Fastify 백엔드용 비동기 작업 제어 라이브러리로, retry(재시도), timeout(타임아웃), pLimit(동시성 제한) 기능을 통합 제공한다. Framework-agnostic core와 NestJS adapter 패턴을 적용하여 순수 TypeScript 환경과 NestJS 환경 모두에서 사용 가능하다.

## Technical Context

**Language/Version**: TypeScript 5.7+ (ES2022, strict mode)
**Primary Dependencies**: Zero dependency (core), @nestjs/common ^10.0.0 || ^11.0.0 (peerDependency)
**Storage**: N/A (in-memory state only)
**Testing**: Vitest 2.x, @nestjs/testing, @sinonjs/fake-timers
**Target Platform**: Node.js 20+ (ESM only)
**Project Type**: npm library (monorepo package)
**Performance Goals**: < 1ms overhead per operation, < 5KB core bundle, < 15KB full bundle
**Constraints**: Zero runtime dependency for core, ±50ms timeout accuracy, 100ms abort cleanup
**Scale/Scope**: 1,000+ concurrent tasks, 80%+ test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate (Phase 0)

| 원칙 | 상태 | 검증 내용 |
|------|------|----------|
| I. 단일 책임 원칙 (SRP) | ✅ PASS | async-utils는 "비동기 작업 제어"라는 단일 문제 영역을 해결. retry, timeout, pLimit은 모두 비동기 제어의 하위 개념 |
| II. 개방-폐쇄 원칙 (OCP) | ✅ PASS | RetryStrategy 인터페이스로 확장 가능, 옵션 기반 콜백 훅 제공 |
| III. 리스코프 치환 원칙 (LSP) | ✅ PASS | 모든 Strategy 구현체는 동일한 인터페이스 계약 준수 |
| IV. 인터페이스 분리 원칙 (ISP) | ✅ PASS | RetryOptions, TimeoutOptions, LimitOptions로 분리된 인터페이스 |
| V. 의존성 역전 원칙 (DIP) | ✅ PASS | Injection Token 기반 DI, forRoot/forRootAsync 패턴 적용 |
| Framework-agnostic Core | ✅ PASS | src/core/는 NestJS 의존성 없음, src/nestjs/는 adapter 역할 |
| 번들 사이즈 기준 | ✅ PASS | Core < 5KB, Full < 15KB 목표 (헌법 기준: Core < 10KB, Full < 15KB) |
| 테스트 커버리지 | ✅ PASS | 80% 이상 목표 (헌법 기준 충족) |

### 패키지명 검증

- `@npm-library/async-utils`는 "비동기 유틸리티"를 명확히 표현
- `utils`, `common`, `shared` 같은 범용 패키지명이 아님
- 해결하는 문제: retry, timeout, concurrency control

**결론**: 모든 헌법 게이트 통과. Phase 0 진행 가능.

## Project Structure

### Documentation (this feature)

```text
specs/001-async-utils/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── async-utils-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/async-utils/
├── src/
│   ├── core/                      # Framework-agnostic
│   │   ├── retry/
│   │   │   ├── retry.ts           # retry 함수
│   │   │   ├── strategies.ts      # ExponentialBackoff, LinearBackoff
│   │   │   └── types.ts           # RetryOptions, RetryStrategy
│   │   ├── timeout/
│   │   │   ├── timeout.ts         # pTimeout 함수
│   │   │   └── types.ts           # TimeoutOptions
│   │   ├── concurrency/
│   │   │   ├── p-limit.ts         # pLimit 함수
│   │   │   ├── priority-queue.ts  # 우선순위 큐
│   │   │   └── types.ts           # LimitOptions, LimitFunction
│   │   ├── errors/
│   │   │   ├── retry-error.ts
│   │   │   ├── timeout-error.ts
│   │   │   └── abort-error.ts
│   │   ├── utils/
│   │   │   └── abort-utils.ts     # AbortSignal 유틸리티
│   │   └── index.ts
│   ├── nestjs/                    # NestJS Integration
│   │   ├── module.ts              # AsyncUtilsModule
│   │   ├── decorators/
│   │   │   ├── retryable.ts       # @Retryable()
│   │   │   ├── timeout.ts         # @Timeout()
│   │   │   └── concurrency.ts     # @ConcurrencyLimit()
│   │   ├── interceptors/
│   │   │   ├── retry.interceptor.ts
│   │   │   └── timeout.interceptor.ts
│   │   ├── constants.ts           # Injection tokens
│   │   └── index.ts
│   └── index.ts                   # 통합 exports
├── test/
│   ├── unit/
│   │   ├── retry.test.ts
│   │   ├── timeout.test.ts
│   │   ├── p-limit.test.ts
│   │   └── errors.test.ts
│   ├── utils/
│   │   └── abort-utils.test.ts
│   ├── integration/
│   │   ├── nestjs-module.test.ts
│   │   └── decorators.test.ts
│   └── helpers/
│       └── timer-helpers.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── CLAUDE.md
```

**Structure Decision**: npm library (monorepo package) - Framework-agnostic core + NestJS adapter 패턴 적용. 헌법 2.2절 "추상화 전략"의 표준 구조를 따름.

## Complexity Tracking

> 헌법 위반 없음. 이 섹션은 비어있음.

## Implementation Phases

### Phase 1: Core Foundation

1. 프로젝트 스캐폴딩 (package.json, tsconfig.json, tsup.config.ts, vitest.config.ts)
2. 에러 클래스 구현 (RetryError, TimeoutError, AbortError)
3. AbortSignal 유틸리티 구현
4. retry 함수 및 백오프 전략 구현
5. pTimeout 함수 구현
6. pLimit 함수 및 우선순위 큐 구현
7. Core 단위 테스트

### Phase 2: NestJS Integration

1. AsyncUtilsModule (forRoot, forRootAsync)
2. 데코레이터 구현 (@Retryable, @Timeout, @ConcurrencyLimit)
3. Interceptor 구현 (RetryInterceptor, TimeoutInterceptor)
4. NestJS 통합 테스트

### Phase 3: Polish & Documentation

1. CLAUDE.md 작성
2. README.md 작성
3. TSDoc 주석 완료
4. 번들 사이즈 최적화 검증
5. 예제 코드 작성

## Dependencies

### dependencies

```json
{}
```

(Zero runtime dependency - 헌법 준수)

### peerDependencies

```json
{
  "@nestjs/common": "^10.0.0 || ^11.0.0",
  "@nestjs/core": "^10.0.0 || ^11.0.0"
}
```

### devDependencies

```json
{
  "typescript": "^5.7.0",
  "tsup": "^8.0.0",
  "vitest": "^2.0.0",
  "@nestjs/testing": "^10.0.0",
  "@sinonjs/fake-timers": "^11.0.0",
  "@types/sinonjs__fake-timers": "^8.1.0",
  "reflect-metadata": "^0.2.0"
}
```

## API Design Summary

### Core API

```typescript
// Retry
export function retry<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  options?: RetryOptions
): Promise<T>;

export interface RetryOptions {
  maxAttempts?: number;           // default: 3 (총 4회 시도)
  strategy?: RetryStrategy;       // default: ExponentialBackoff
  retryIf?: (error: Error) => boolean;
  signal?: AbortSignal;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryStrategy {
  shouldRetry(error: Error, attempt: number): boolean;
  getDelay(attempt: number): number;
}

// Timeout
export function pTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T>;

export interface TimeoutOptions {
  milliseconds: number;
  fallback?: T | (() => T | Promise<T>);
  signal?: AbortSignal;
  onTimeout?: () => void;
}

// Concurrency
export function pLimit(concurrency: number): LimitFunction;

export interface LimitFunction {
  <T>(fn: () => Promise<T>, options?: { priority?: number }): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
  clearQueue(): void;
  setConcurrency(n: number): void;
}
```

### NestJS API

```typescript
// Module
@Module({})
export class AsyncUtilsModule {
  static forRoot(options?: AsyncUtilsModuleOptions): DynamicModule;
  static forRootAsync(options: AsyncUtilsModuleAsyncOptions): DynamicModule;
}

// Decorators - strategy는 문자열 alias 또는 RetryStrategy 객체 모두 지원
@Retryable({ maxAttempts: 3, strategy: 'exponential' })  // 문자열: 'exponential' | 'linear'
@Retryable({ maxAttempts: 3, strategy: new CustomStrategy() })  // 객체: RetryStrategy 구현체
@Timeout(5000)
@ConcurrencyLimit(10)

// Interceptors
@UseInterceptors(RetryInterceptor)
@UseInterceptors(TimeoutInterceptor)
```

**데코레이터 strategy 옵션 타입**:
```typescript
type RetryStrategyOption = 'exponential' | 'linear' | RetryStrategy;
```

## Post-Design Constitution Re-check

*To be completed after Phase 1 design artifacts are generated.*
