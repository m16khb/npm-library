# Research: @npm-library/async-utils

**Date**: 2025-12-05
**Feature**: 001-async-utils
**Status**: Complete

## 1. 기존 라이브러리 분석

### 1.1 p-retry (sindresorhus)

**분석 결과**:
- GitHub: https://github.com/sindresorhus/p-retry
- 번들 사이즈: ~1.2KB (minified + gzipped)
- 의존성: retry (is-network-error 선택적)
- 라이선스: MIT

**핵심 패턴**:
```typescript
// 함수 시그니처
pRetry(input, options?)

// 옵션 구조
{
  onFailedAttempt: (error) => void,
  retries: number,
  factor: number,
  minTimeout: number,
  maxTimeout: number,
  randomize: boolean,
  signal: AbortSignal
}
```

**채택할 패턴**:
- `onFailedAttempt` 콜백 → `onRetry`로 변환
- AbortSignal 지원

**거부한 패턴**:
- `retry` 라이브러리 의존성 → Zero dependency 원칙 위반
- `is-network-error` 의존성 → 사용자가 `retryIf`로 직접 구현

### 1.2 p-timeout (sindresorhus)

**분석 결과**:
- GitHub: https://github.com/sindresorhus/p-timeout
- 번들 사이즈: ~0.5KB (minified + gzipped)
- 의존성: 없음
- 라이선스: MIT

**핵심 패턴**:
```typescript
// 함수 시그니처
pTimeout(promise, options)

// 옵션 구조
{
  milliseconds: number,
  message?: string | Error,
  fallback?: () => ReturnValue,
  customTimers?: { setTimeout, clearTimeout }
}
```

**채택할 패턴**:
- fallback 함수 지원
- customTimers (테스트 용이성)

**추가할 기능**:
- AbortSignal 지원 (원본에 없음)
- onTimeout 콜백 (옵저버빌리티)

### 1.3 p-limit (sindresorhus)

**분석 결과**:
- GitHub: https://github.com/sindresorhus/p-limit
- 번들 사이즈: ~0.4KB (minified + gzipped)
- 의존성: yocto-queue
- 라이선스: MIT

**핵심 패턴**:
```typescript
// 팩토리 함수
const limit = pLimit(concurrency);

// 사용
const result = await limit(() => fetchSomething());

// 속성
limit.activeCount;
limit.pendingCount;
limit.clearQueue();
```

**채택할 패턴**:
- 팩토리 함수 패턴
- activeCount, pendingCount 속성
- clearQueue 메서드

**추가할 기능**:
- 우선순위 큐 (0-10 범위)
- 동적 동시성 조정 (setConcurrency)
- yocto-queue 대신 내장 구현 (Zero dependency)

## 2. 기술 결정

### 2.1 백오프 전략 인터페이스

**Decision**: RetryStrategy 인터페이스 도입

**Rationale**:
- 헌법 2.1절 OCP 원칙 준수
- 사용자 정의 전략 확장 가능
- 테스트 용이성

**구현**:
```typescript
export interface RetryStrategy {
  shouldRetry(error: Error, attempt: number): boolean;
  getDelay(attempt: number): number;
}

export class ExponentialBackoff implements RetryStrategy {
  constructor(
    private readonly baseDelay = 100,
    private readonly maxDelay = 10000,
    private readonly multiplier = 2
  ) {}

  shouldRetry(_error: Error, attempt: number): boolean {
    return attempt < this.maxAttempts;
  }

  getDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(this.multiplier, attempt);
    return Math.min(delay, this.maxDelay);
  }
}

export class LinearBackoff implements RetryStrategy {
  constructor(private readonly delay = 1000) {}

  shouldRetry(_error: Error, attempt: number): boolean {
    return attempt < this.maxAttempts;
  }

  getDelay(_attempt: number): number {
    return this.delay;
  }
}
```

**Alternatives considered**:
- 함수 기반 전략: 타입 안전성 낮음, 거부됨
- 설정 객체만 사용: 확장성 제한, 거부됨

### 2.2 우선순위 큐 구현

**Decision**: 내장 Min-Heap 기반 우선순위 큐

**Rationale**:
- yocto-queue 의존성 제거 (Zero dependency)
- 우선순위 지원 필요 (원본 p-limit에 없음)
- O(log n) 삽입/삭제 성능

**구현 방식**:
```typescript
class PriorityQueue<T> {
  private heap: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void;
  dequeue(): T | undefined;
  get size(): number;
  clear(): void;
}
```

**Alternatives considered**:
- 단순 배열 + sort: O(n log n) 삽입, 비효율적
- 외부 라이브러리: Zero dependency 원칙 위반

### 2.3 AbortSignal 통합 패턴

**Decision**: 모든 비동기 함수에서 AbortSignal 지원

**Rationale**:
- 스펙 FR-012 요구사항
- 웹 표준 API 사용
- 리소스 정리 보장

**구현 패턴**:
```typescript
export function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortError('Operation was aborted');
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortError(signal.reason ?? 'Operation was aborted');
  }
}

export function createAbortableDelay(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError(signal.reason));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new AbortError(signal.reason));
    }, { once: true });
  });
}
```

### 2.4 에러 클래스 설계

**Decision**: ES2022 Error cause 체인 사용

**Rationale**:
- 스펙 FR-024 요구사항
- Node.js 20+ 환경 가정
- 네이티브 에러 체이닝 지원

**구현**:
```typescript
export class RetryError extends Error {
  name = 'RetryError';

  constructor(
    message: string,
    public readonly attempts: number,
    options?: { cause?: Error }
  ) {
    super(message, options);
  }
}

export class TimeoutError extends Error {
  name = 'TimeoutError';

  constructor(
    message: string = 'Operation timed out',
    options?: { cause?: Error }
  ) {
    super(message, options);
  }
}

export class AbortError extends Error {
  name = 'AbortError';

  constructor(
    message: string = 'Operation was aborted',
    options?: { cause?: Error }
  ) {
    super(message, options);
  }
}
```

### 2.5 NestJS 데코레이터 구현 방식

**Decision**: SetMetadata + Interceptor 패턴

**Rationale**:
- 헌법 2.3절 "데코레이터 설계 규칙" 준수
- 데코레이터는 메타데이터만, 로직은 Interceptor에서
- applyDecorators로 합성 가능

**구현**:
```typescript
// 메타데이터 키
export const RETRY_OPTIONS = Symbol('RETRY_OPTIONS');
export const TIMEOUT_OPTIONS = Symbol('TIMEOUT_OPTIONS');
export const CONCURRENCY_OPTIONS = Symbol('CONCURRENCY_OPTIONS');

// 데코레이터
export function Retryable(options?: RetryOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(RETRY_OPTIONS, options),
    UseInterceptors(RetryInterceptor),
  );
}

// Interceptor
@Injectable()
export class RetryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get(RETRY_OPTIONS, context.getHandler());
    // retry 로직 적용
  }
}
```

## 3. 성능 최적화 전략

### 3.1 번들 사이즈 최적화

**전략**:
1. Tree-shaking 지원 (named exports only)
2. Sub-path exports 제공
3. Side-effect free 선언

**package.json exports**:
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./core": "./dist/core/index.js",
    "./nestjs": "./dist/nestjs/index.js"
  },
  "sideEffects": false
}
```

### 3.2 런타임 오버헤드 최소화

**전략**:
1. 불필요한 객체 생성 최소화
2. Promise microtask 활용
3. WeakMap 기반 인스턴스 캐싱 (데코레이터)

### 3.3 메모리 누수 방지

**전략**:
1. AbortSignal 리스너 자동 정리
2. setTimeout/setInterval 정리 보장
3. clearQueue 호출 시 pending Promise rejection

## 4. 테스트 전략

### 4.1 타이밍 테스트

**Decision**: @sinonjs/fake-timers 사용

**Rationale**:
- Vitest와 호환
- setTimeout, setInterval 모킹
- 실제 시간 대기 없이 테스트

**사용 예**:
```typescript
import { install, InstalledClock } from '@sinonjs/fake-timers';

describe('retry', () => {
  let clock: InstalledClock;

  beforeEach(() => {
    clock = install();
  });

  afterEach(() => {
    clock.uninstall();
  });

  it('should wait between retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const promise = retry(fn, { maxAttempts: 2 });

    await clock.tickAsync(100); // first delay
    await clock.tickAsync(200); // second delay

    await expect(promise).rejects.toThrow();
  });
});
```

### 4.2 NestJS 통합 테스트

**패턴**: @nestjs/testing TestingModule

```typescript
describe('AsyncUtilsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AsyncUtilsModule.forRoot({
          retry: { maxAttempts: 3 },
          timeout: { milliseconds: 5000 },
        }),
      ],
    }).compile();
  });

  it('should provide retry service', () => {
    const service = module.get(ASYNC_UTILS_OPTIONS);
    expect(service).toBeDefined();
  });
});
```

## 5. 결론

모든 기술적 불확실성이 해결되었습니다:

| 영역 | 결정 | 근거 |
|------|------|------|
| 백오프 전략 | RetryStrategy 인터페이스 | OCP 원칙, 확장성 |
| 우선순위 큐 | 내장 Min-Heap | Zero dependency |
| AbortSignal | 모든 함수에서 지원 | 웹 표준, 리소스 정리 |
| 에러 클래스 | ES2022 cause 체인 | 네이티브 지원 |
| NestJS 통합 | SetMetadata + Interceptor | 헌법 패턴 준수 |
| 테스트 | fake-timers | 타이밍 테스트 신뢰성 |

Phase 1 설계 진행 준비 완료.
