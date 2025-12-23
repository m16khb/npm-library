# @m16khb/nestjs-async-utils

## WHAT: 기술 스택

- **TypeScript**: 5.7+ (ES2022, strict mode)
- **Node.js**: 20+
- **NestJS**: 10.x / 11.x 호환

### 필수 의존성 (peerDependencies)

- `@nestjs/common` ^10.0.0 || ^11.0.0 (선택적, NestJS 데코레이터 사용 시)
- `@nestjs/core` ^10.0.0 || ^11.0.0 (선택적)
- `rxjs` ^7.0.0 (선택적)

### 코어 의존성

- **Zero dependency** - 프레임워크 독립적인 코어 유틸리티

## WHY: 존재 이유

NestJS 애플리케이션에서 **비동기 작업 제어**를 선언적으로 적용. 재시도, 타임아웃, 동시성 제한을 데코레이터로 쉽게 적용하여 중복 코드를 제거.

### 핵심 설계 원칙

1. **데코레이터 기반**: `@Retryable`, `@Timeout`, `@ConcurrencyLimit`으로 선언적 제어
2. **프레임워크 독립 코어**: NestJS 없이도 사용 가능한 순수 유틸리티 제공
3. **선택적 NestJS 의존성**: 코어 기능은 peerDependency 없이 동작
4. **서브패스 export**: 필요한 모듈만 tree-shaking 가능 (/core, /nestjs, /retry, /timeout, /concurrency)

## HOW: 주요 컴포넌트

### 1. NestJS 데코레이터

- **@Retryable** - 실패 시 자동 재시록 (지수 백오프 지원)
- **@Timeout** - 메서드 실행 시간 제한
- **@ConcurrencyLimit** - 동시 실행 수 제한

### 2. Core Utilities

- **retry()** - 프레임워크 독립적 재시론 함수
- **pTimeout()** - Promise 타임아웃 래퍼
- **pLimit()** - 동시성 제한 함수
- **wait()** - 지연 함수

### 3. Backoff Strategies

- **exponentialBackoff()** - 지수 백오프
- **exponentialBackoffWithJitter()** - 지터 추가 지수 백오프
- **linearBackoff()** - 선형 백오프
- **fixedDelay()** - 고정 지연

## 파일 구조

```
src/
├── index.ts                    # 메인 export (nestjs)
├── core/
│   ├── index.ts                # Core utilities export
│   ├── retry.ts                # retry 함수, backoff strategies
│   ├── timeout.ts              # pTimeout 함수
│   ├── concurrency.ts          # pLimit 함수
│   └── wait.ts                 # wait 함수
└── nestjs/
    ├── index.ts                # NestJS exports
    ├── constants.ts            # 상수, 메타데이터 키
    ├── interfaces/
    │   └── module-options.interface.ts
    ├── decorators/
    │   ├── retryable.decorator.ts
    │   ├── timeout.decorator.ts
    │   └── concurrency-limit.decorator.ts
    └── services/
        ├── async-utils.module.ts
        ├── async-utils-logger.service.ts
        └── concurrency-manager.service.ts
```

## 내보내기 경로 (Exports)

```typescript
// NestJS 데코레이터와 모듈
import { AsyncUtilsModule, Retryable, Timeout, ConcurrencyLimit } from '@m16khb/nestjs-async-utils/nestjs';

// 프레임워크 독립적 코어 유틸리티
import { retry, pTimeout, pLimit, wait } from '@m16khb/nestjs-async-utils/core';

// 개별 모듈 (tree-shaking 최적화)
import { retry, exponentialBackoff } from '@m16khb/nestjs-async-utils/retry';
import { pTimeout } from '@m16khb/nestjs-async-utils/timeout';
import { pLimit } from '@m16khb/nestjs-async-utils/concurrency';
```

## 테스트

```bash
pnpm test          # 테스트 실행
pnpm test:watch    # Watch 모드
pnpm test:coverage # 커버리지
pnpm build         # 빌드
pnpm typecheck     # 타입 체크
```

## 번들 사이즈

| 모듈 | 크기 | gzip |
|------|------|------|
| nestjs | ~1 KB | ~0.5 KB |
| core | ~2 KB | ~0.8 KB |

## 주요 명령어

```bash
pnpm build      # 빌드
pnpm test       # 테스트
pnpm typecheck  # 타입 체크
pnpm clean      # 빌드 결과물 삭제
```

## 사용 예시

```typescript
@Module({
  imports: [
    AsyncUtilsModule.forRoot({
      defaultRetries: 3,
      defaultTimeout: 30000,
      defaultConcurrency: 10,
      enableLogging: true,
    }),
  ],
})
export class AppModule {}

@Injectable()
export class PaymentService {
  @ConcurrencyLimit(5)       // 최대 5개 동시 실행
  @Retryable({ retries: 3 }) // 실패 시 3회 재시도
  @Timeout(5000)             // 각 시도 5초 타임아웃
  async processPayment(orderId: string): Promise<PaymentResult> {
    return this.paymentGateway.charge(orderId);
  }
}
```
