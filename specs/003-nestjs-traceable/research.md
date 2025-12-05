# Research: NestJS Traceable

**Date**: 2025-12-05
**Feature**: 003-nestjs-traceable

## 1. AsyncLocalStorage Best Practices

### Decision
Node.js 20+ 네이티브 AsyncLocalStorage만 사용하고, cls-hooked 등 폴백은 제공하지 않는다.

### Rationale
- Node.js 20+에서 AsyncLocalStorage는 안정적이고 성능이 우수함
- Zero dependency 제약을 충족
- cls-hooked는 deprecated이며 Node.js 14 이전 호환성을 위한 것
- 단일 구현으로 유지보수 복잡성 감소

### Alternatives Considered
1. **cls-hooked 폴백**: Node.js 14/16 지원 가능하나 의존성 추가, deprecated 라이브러리 사용 문제
2. **zone.js**: Angular 생태계에서 사용, 번들 사이즈 증가, NestJS와 충돌 가능성

## 2. TraceId 생성 전략

### Decision
기본값으로 UUID v4 사용, 커스텀 생성기 인터페이스 제공

### Rationale
- UUID v4는 충돌 확률이 극히 낮고 (2^122 조합) 널리 사용됨
- Node.js crypto.randomUUID()는 네이티브 구현으로 성능 우수
- 커스텀 생성기를 통해 ULID, nanoid 등 다른 형식 지원 가능

### Alternatives Considered
1. **ULID**: 시간 정렬 가능하나 외부 의존성 필요 (ulid 패키지)
2. **nanoid**: 더 짧은 ID, 외부 의존성 필요
3. **Snowflake ID**: 분산 시스템에 적합하나 복잡한 설정 필요

### Implementation
```typescript
// 기본 UUID v4 생성기
export function generateTraceId(): string {
  return crypto.randomUUID();
}

// SpanId는 8자리 hex (16자리 hex의 절반)
export function generateSpanId(): string {
  return crypto.randomBytes(4).toString('hex');
}
```

## 3. NestJS Middleware vs Interceptor

### Decision
HTTP traceId 추출/주입은 Middleware에서, Span 생성은 Interceptor에서 처리

### Rationale
- **Middleware**: 요청 진입점에서 즉시 실행, 모든 요청에 적용, 응답 헤더 설정 가능
- **Interceptor**: Guard 이후 실행, 특정 핸들러에 선택적 적용, 메서드 실행 전후 로직

### 역할 분리
| 레이어 | 역할 | 타이밍 |
|--------|------|--------|
| Middleware | traceId 추출/생성, 응답 헤더 설정 | 요청 진입 즉시 |
| Interceptor | Span 시작/종료, 메서드 실행 시간 측정 | 핸들러 실행 전후 |
| Decorator | 메타데이터 설정 (operation name 등) | 컴파일 타임 |

## 4. 로거 통합 방식

### Decision
LoggerAdapter 인터페이스 제공, NestJS Logger/Console 기본 구현

### Rationale
- NestJS Logger가 가장 일반적인 사용 사례
- 외부 로거(Winston, Pino, Bunyan)는 어댑터 구현으로 지원
- 라이브러리 자체는 특정 로거에 의존하지 않음

### Interface Design
```typescript
export interface LoggerAdapter {
  log(message: string, context?: TraceContext): void;
  error(message: string, trace?: string, context?: TraceContext): void;
  warn(message: string, context?: TraceContext): void;
  debug(message: string, context?: TraceContext): void;
}
```

### 어댑터 패턴
```typescript
// 사용자 코드
const pinoAdapter: LoggerAdapter = {
  log: (msg, ctx) => pino.info({ traceId: ctx?.traceId }, msg),
  // ...
};

TraceModule.forRoot({
  logger: pinoAdapter,
});
```

## 5. BullMQ 통합 방식

### Decision
Job 데이터에 `_traceId` 키로 traceId 저장, Processor에서 컨텍스트 복원

### Rationale
- `_` prefix로 사용자 데이터와 충돌 방지
- Job 데이터는 직렬화 가능해야 하므로 단순 문자열 저장
- Processor 데코레이터에서 자동으로 컨텍스트 초기화

### Implementation Pattern
```typescript
// Producer 측
queue.add('job', { ...data, _traceId: getTraceId() });

// Processor 측
@TracedProcessor('queue-name')
class MyProcessor {
  @Process()
  async handle(job: Job) {
    // _traceId가 자동으로 TraceContext에 설정됨
  }
}
```

## 6. gRPC Metadata 전파

### Decision
gRPC metadata key로 `trace-id` 사용 (OpenTelemetry 호환)

### Rationale
- OpenTelemetry와 호환되는 키 이름
- gRPC metadata는 문자열 키-값 쌍
- 서버/클라이언트 인터셉터로 양방향 전파

### Implementation Pattern
```typescript
// 클라이언트 인터셉터
const metadata = new Metadata();
metadata.set('trace-id', getTraceId());
return next(metadata);

// 서버 인터셉터
const traceId = metadata.get('trace-id')?.[0];
runWithContext({ traceId }, () => next());
```

## 7. 성능 최적화

### Decision
지연 평가, 불필요한 객체 생성 최소화

### Rationale
- 1ms 미만 오버헤드 목표 충족
- 메모리 사용량 최소화

### 최적화 전략
1. **지연 평가**: TraceContext 객체는 필요할 때만 생성
2. **재사용**: 동일 요청 내에서 컨텍스트 객체 재사용
3. **인라인 캐싱**: 자주 접근하는 값(traceId) 캐싱
4. **GC 최적화**: 임시 객체 생성 최소화

### 벤치마크 대상
- TraceContext 생성 시간
- AsyncLocalStorage 접근 시간
- Span 시작/종료 오버헤드
- 동시 요청 처리 시 메모리 사용량

## 8. 오류 처리 전략

### Decision
Silent Continue - 추적 오류 시 요청 처리 계속

### Rationale
- 추적은 관측(observability) 기능이며 핵심 비즈니스 로직이 아님
- 추적 실패로 서비스 장애가 발생하면 안 됨
- OpenTelemetry, Jaeger 등 주요 추적 라이브러리도 동일한 정책

### Error Handling Pattern
```typescript
export function withTraceContext<T>(fn: () => T): T {
  try {
    return runWithContext(createContext(), fn);
  } catch (error) {
    // 내부 경고 로그만 출력
    console.warn(`[nestjs-traceable] Context error: ${error}`);
    // 컨텍스트 없이 실행
    return fn();
  }
}
```

## 9. 외부 라이브러리 분석

### 기존 솔루션 검토

| 라이브러리 | 장점 | 단점 | 채택 여부 |
|-----------|------|------|----------|
| nestjs-cls | NestJS 통합 우수 | 범용 CLS, 추적 특화 아님 | 참고만 |
| nestjs-pino | Pino 로거 통합 | 특정 로거에 종속 | 참고만 |
| @opentelemetry/* | 표준 분산 추적 | 복잡함, 의존성 많음 | 향후 확장 |

### nestjs-cls 패턴 참고
```typescript
// nestjs-cls의 ClsModule 패턴 참고
@Module({})
export class TraceModule {
  static forRoot(options?: TraceModuleOptions): DynamicModule {
    return {
      module: TraceModule,
      global: true, // 전역 모듈
      providers: [...],
      exports: [...],
    };
  }
}
```

## 10. API 설계 결정

### Public API

```typescript
// 1. 모듈 설정
TraceModule.forRoot({
  headerName: 'X-Trace-Id',
  traceIdGenerator: () => uuid(),
  logger: customLogger,
});

// 2. 데코레이터
@Traceable() // 클래스에 적용
@Trace('operation-name') // 메서드에 적용

// 3. 프로그래매틱 API
TraceContext.getTraceId();
TraceContext.getSpanId();
TraceContext.startSpan('name');
TraceContext.endSpan();

// 4. 서비스 주입
@Injectable()
class MyService {
  constructor(private readonly trace: TraceContextService) {}
}
```

## 11. Span 자동 정리 정책

### Decision
HTTP 요청/Job 처리 완료 시 미종료 span 자동 정리

### Rationale
- 개발자 실수로 endSpan() 누락 시 메모리 누수 방지
- 컨텍스트 오염 방지
- Silent Continue 정책과 일관성 유지

### Implementation
```typescript
// 요청 완료 시 호출되는 정리 로직
function cleanupUnfinishedSpans(context: TraceContext, options: TraceModuleOptions): void {
  const spanStack = context.getSpanStack();

  if (spanStack.length === 0) return;

  // 미종료 span이 있으면 경고 및 정리
  if (options.warnOnUnfinishedSpans !== false) {
    for (const span of spanStack) {
      console.warn(
        `[nestjs-traceable] Unfinished span detected: ${span.operationName} ` +
        `(traceId: ${span.traceId}, spanId: ${span.spanId})`
      );
    }
  }

  if (options.autoCleanupSpans !== false) {
    const now = Date.now();
    for (const span of spanStack) {
      span.status = 'error';
      span.endTime = now;
    }
    context.clearSpanStack();
  }
}
```

### Configuration
| 옵션 | 기본값 | 설명 |
|------|--------|------|
| autoCleanupSpans | true | 미종료 span 자동 정리 |
| warnOnUnfinishedSpans | true | 경고 로그 출력 |

## 12. Span 최대 깊이 제한

### Decision
기본 최대 깊이 100, 설정 가능

### Rationale
- 무한 재귀 또는 잘못된 코드로 인한 스택 오버플로우 방지
- 합리적인 기본값으로 대부분의 사용 사례 커버
- 필요시 사용자가 조정 가능

### Implementation
```typescript
function startSpan(operationName: string, options: TraceModuleOptions): ISpan | null {
  const maxDepth = options.maxSpanDepth ?? DEFAULT_MAX_SPAN_DEPTH;
  const currentDepth = context.getSpanStack().length;

  if (currentDepth >= maxDepth) {
    console.warn(
      `[nestjs-traceable] Max span depth (${maxDepth}) exceeded. ` +
      `Span "${operationName}" will not be created.`
    );
    return null;
  }

  // span 생성 로직...
}
```

## Summary

모든 기술 결정이 완료되었으며 NEEDS CLARIFICATION 항목 없음. 다음 단계로 진행 가능.
