# Research: NestJS 비동기 유틸리티 데코레이터 통합

**Feature Branch**: `002-nestjs-async-decorators`
**Date**: 2025-12-05

## 1. NestJS 데코레이터 패턴

### Decision: `applyDecorators` + `SetMetadata` + `UseInterceptors` 조합 사용

**Rationale:**
- NestJS 공식 권장 패턴
- 메타데이터와 인터셉터를 하나의 데코레이터로 묶어 사용 편의성 제공
- 타입 안전성 유지

**Alternatives Considered:**
- 순수 TypeScript 데코레이터만 사용 → NestJS DI 시스템 활용 불가
- Aspect-Oriented Programming (AOP) 라이브러리 → 추가 의존성 발생

**Code Pattern:**
```typescript
export function Retryable(options?: RetryableOptions) {
  return applyDecorators(
    SetMetadata(RETRYABLE_OPTIONS, options),
    UseInterceptors(RetryableInterceptor),
  );
}
```

---

## 2. 인터셉터에서 메타데이터 접근

### Decision: `Reflector.getAllAndOverride` 패턴 사용

**Rationale:**
- 메서드 레벨 > 클래스 레벨 > 전역 설정 우선순위 자연스럽게 구현
- NestJS 9+ 공식 API

**Code Pattern:**
```typescript
const options = this.reflector.getAllAndOverride<RetryableOptions>(
  RETRYABLE_OPTIONS,
  [context.getHandler(), context.getClass()],
);
```

---

## 3. 데코레이터 실행 순서

### Decision: ConcurrencyLimit → Retryable → Timeout 순서

**Rationale:**
- **ConcurrencyLimit 먼저**: 대기열에서 슬롯을 확보한 후 실행 시작
- **Retryable 중간**: 재시도 로직이 실행을 감싸야 함
- **Timeout 마지막**: 각 시도마다 개별 타임아웃 적용

**TypeScript 데코레이터 실행 규칙:**
- 평가(Evaluation): 위 → 아래
- 실행(Execution): 아래 → 위 (역순)

**적용 예시:**
```typescript
// 사용자가 작성하는 순서 (의도 명확하게)
@ConcurrencyLimit(5)    // 3번째 실행 (가장 바깥)
@Retryable({ retries: 3 }) // 2번째 실행
@Timeout(5000)          // 1번째 실행 (가장 안쪽)
async processPayment() {}

// 실제 실행 흐름:
// ConcurrencyLimit.intercept() → Retryable.intercept() → Timeout.intercept() → Handler
```

---

## 4. Per-Method 상태 관리 (동시성 카운터)

### Decision: `Map<string, LimitFunction>` + `ClassName.methodName` 키 패턴

**Rationale:**
- 각 메서드별 독립적인 동시성 제어 필요 (스펙 FR-005)
- 기존 `pLimit` 함수 재사용 가능
- WeakMap 대신 Map 사용 - 메서드 참조가 변하지 않아 메모리 누수 위험 없음

**Code Pattern:**
```typescript
@Injectable()
export class ConcurrencyManagerService {
  private readonly limiters = new Map<string, LimitFunction>();

  getLimiter(className: string, methodName: string, concurrency: number): LimitFunction {
    const key = `${className}.${methodName}`;
    if (!this.limiters.has(key)) {
      this.limiters.set(key, pLimit(concurrency));
    }
    return this.limiters.get(key)!;
  }
}
```

---

## 5. 모듈 설계 패턴

### Decision: `ConfigurableModuleBuilder` 사용 (NestJS 9+)

**Rationale:**
- 보일러플레이트 코드 감소
- `forRoot`/`forRootAsync` 자동 생성
- 타입 안전성 내장

**Alternatives Considered:**
- 전통적인 DynamicModule 패턴 → 더 많은 수동 코드 필요
- 단순 useValue Provider → forRootAsync 지원 어려움

**Code Pattern:**
```typescript
export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AsyncUtilsModuleOptions>()
  .setClassMethodName('forRoot')
  .setExtras({ isGlobal: true }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();
```

---

## 6. 선택적 로깅

### Decision: NestJS Logger + 옵션 기반 활성화

**Rationale:**
- NestJS 생태계와 일관성 유지
- 전역/데코레이터별 활성화 제어 가능
- 런타임 오버헤드 최소화 (비활성화 시 로깅 코드 스킵)

**Code Pattern:**
```typescript
// 로깅 활성화 여부 체크
const shouldLog = options?.enableLogging ?? this.moduleOptions.enableLogging ?? false;

if (shouldLog) {
  this.logger.log(`[${className}.${methodName}] Retry attempt ${attempt}/${maxRetries}`);
}
```

---

## 7. 기존 Core 함수 통합 전략

### Decision: 인터셉터 내부에서 Core 함수 직접 호출

**Rationale:**
- 코드 중복 방지
- 기존 테스트된 로직 재사용
- 동작 일관성 보장

**통합 매핑:**

| Core 함수 | NestJS 인터셉터 | 역할 |
|-----------|----------------|------|
| `retry()` | `RetryableInterceptor` | 재시도 로직 래핑 |
| `pLimit()` | `ConcurrencyLimitInterceptor` | 동시성 제한 |
| `pTimeout()` | `TimeoutInterceptor` | 타임아웃 적용 |

**Code Pattern:**
```typescript
// RetryableInterceptor 내부
return from(
  retry(
    () => firstValueFrom(next.handle()),
    {
      attempts: options.retries,
      strategy: options.strategy,
      retryIf: options.retryWhen,
      signal: /* AbortSignal if available */,
    }
  )
);
```

---

## 8. 에러 처리 전략

### Decision: Core 에러 클래스 재사용 + NestJS HttpException 래핑

**Rationale:**
- `RetryError`, `TimeoutError`, `AbortError` 의미적 정보 보존
- NestJS 에러 필터와 호환
- 스택 트레이스 유지

**Code Pattern:**
```typescript
catchError((error) => {
  if (TimeoutError.isTimeoutError(error)) {
    throw new HttpException(
      `Request timeout after ${error.timeout}ms`,
      HttpStatus.REQUEST_TIMEOUT,
      { cause: error }
    );
  }
  throw error;
})
```

---

## 9. AbortSignal 통합

### Decision: NestJS Request Lifecycle과 연동

**Rationale:**
- 클라이언트 연결 종료 시 진행 중인 작업 취소 가능
- 리소스 낭비 방지

**Consideration:**
- HTTP Request의 AbortSignal 접근은 Fastify/Express adapter에 따라 다름
- 초기 버전에서는 수동 취소 지원, 향후 자동 연동 검토

---

## 10. 테스트 전략

### Decision: Vitest + @nestjs/testing + Mock 인터셉터

**Rationale:**
- 기존 프로젝트 테스트 스택과 일관성
- NestJS TestingModule로 실제 DI 환경 테스트
- 인터셉터 단위 테스트는 Mock CallHandler 사용

**테스트 분류:**

| 테스트 유형 | 범위 | 도구 |
|------------|------|------|
| 단위 테스트 | 개별 인터셉터, 데코레이터 | Vitest + vi.mock |
| 통합 테스트 | 모듈 초기화, DI 주입 | @nestjs/testing |
| E2E 테스트 | 전체 데코레이터 동작 | TestingModule + 실제 서비스 |

---

## 요약: 핵심 기술 결정

| 영역 | 결정 | 근거 |
|------|------|------|
| 데코레이터 생성 | `applyDecorators` | NestJS 공식 패턴 |
| 메타데이터 접근 | `Reflector.getAllAndOverride` | 우선순위 자동 처리 |
| 실행 순서 | ConcurrencyLimit → Retryable → Timeout | 의미적으로 올바른 순서 |
| 상태 관리 | `Map<string, LimitFunction>` | 메서드별 독립 상태 |
| 모듈 패턴 | `ConfigurableModuleBuilder` | 보일러플레이트 감소 |
| 로깅 | 옵션 기반 NestJS Logger | 선택적 활성화 |
| Core 통합 | 인터셉터에서 직접 호출 | 코드 재사용 |
| 에러 처리 | Core 에러 + HttpException | 의미 보존 + 호환성 |
