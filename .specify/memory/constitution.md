<!--
Sync Impact Report:
- Version change: 1.0.0 → 2.0.0 (MAJOR - 구조 전면 개편)
- Modified principles:
  - "Library-First Design" → "I. 단일 책임 원칙 (SRP)"
  - "Framework Agnostic" → "II. 개방-폐쇄 원칙 (OCP)"
  - "API Stability" → 섹션 4.3 버전 관리로 이동
  - "Comprehensive Testing" → 섹션 3.2 테스트 요구사항으로 확장
  - "Documentation Driven" → 섹션 3.3 문서화 기준으로 확장
- Added sections:
  - 1. 비전 및 미션
  - 2.1 SOLID 원칙 적용 (5개 원칙 상세화)
  - 2.2 추상화 전략
  - 2.3 NestJS-Fastify 패턴
  - 3. 품질 기준 (코드/테스트/문서/성능)
  - 4. 의존성 정책 (내부/외부/버전)
  - 5. 운영 규칙 (패키지 생성/기여/릴리스/Deprecation)
  - 6. 예외 처리
  - 부록 A, B, C
- Removed sections:
  - "Library Extraction Criteria" (섹션 5.1로 통합)
- Templates requiring updates:
  - ✅ plan-template.md: Constitution Check 섹션 호환
  - ✅ spec-template.md: 요구사항 구조 호환
  - ✅ tasks-template.md: 테스트 요구사항 반영
- Follow-up TODOs: None
-->

# NPM Library 헌법 (Constitution)

## 목차

1. [비전 및 미션](#1-비전-및-미션)
2. [설계 원칙](#2-설계-원칙)
   - 2.1 [SOLID 원칙 적용](#21-solid-원칙-적용)
   - 2.2 [추상화 전략](#22-추상화-전략)
   - 2.3 [NestJS-Fastify 패턴](#23-nestjs-fastify-패턴)
3. [품질 기준](#3-품질-기준)
   - 3.1 [코드 품질](#31-코드-품질)
   - 3.2 [테스트 요구사항](#32-테스트-요구사항)
   - 3.3 [문서화 기준](#33-문서화-기준)
   - 3.4 [성능 기준](#34-성능-기준)
4. [의존성 정책](#4-의존성-정책)
   - 4.1 [내부 의존성](#41-내부-의존성)
   - 4.2 [외부 의존성](#42-외부-의존성)
   - 4.3 [버전 관리](#43-버전-관리)
5. [운영 규칙](#5-운영-규칙)
   - 5.1 [패키지 생성 절차](#51-패키지-생성-절차)
   - 5.2 [기여 가이드라인](#52-기여-가이드라인)
   - 5.3 [릴리스 정책](#53-릴리스-정책)
   - 5.4 [Deprecation 정책](#54-deprecation-정책)
6. [예외 처리](#6-예외-처리)
7. [부록](#부록)

---

## 1. 비전 및 미션

### 비전

NestJS-Fastify 생태계에서 반복되는 문제들을 해결하는 고품질 npm 라이브러리 컬렉션을 구축한다.

### 미션

- NestJS-Fastify 개발자들이 공통적으로 직면하는 기술적 문제를 식별한다
- SOLID 원칙과 적절한 추상화를 통해 재사용 가능한 솔루션을 제공한다
- Framework-agnostic core와 NestJS adapter 패턴으로 유연성을 보장한다
- 철저한 테스트와 문서화로 프로덕션 환경에서 신뢰할 수 있는 라이브러리를 제공한다

### 핵심 가치

1. **단순성**: 최소한의 API로 최대의 문제를 해결한다
2. **신뢰성**: 100% 테스트 커버리지와 타입 안전성을 보장한다
3. **호환성**: NestJS/Fastify 버전 업그레이드에 안정적으로 대응한다
4. **개방성**: 명확한 확장 포인트를 제공하여 커스터마이징을 허용한다

---

## 2. 설계 원칙

### 2.1 SOLID 원칙 적용

#### I. 단일 책임 원칙 (SRP)

각 라이브러리는 하나의 명확한 문제 영역만 해결해야 한다.

**MUST**:
- 하나의 패키지는 하나의 핵심 기능만 제공한다
- 패키지명은 해결하는 문제를 명확히 표현한다 (예: `@npm-library/retry`, `@npm-library/timeout`)
- 여러 기능이 필요한 경우 별도 패키지로 분리한다

**금지 사항**:
- `utils`, `common`, `shared` 같은 범용 패키지명 사용
- 관련 없는 기능을 하나의 패키지에 번들링

```typescript
// 좋은 예: 단일 책임
// packages/retry - 재시도 로직만 담당
export { retry, RetryOptions } from './retry';

// 나쁜 예: 복합 책임
// packages/utils - 여러 기능 혼합
export { retry } from './retry';
export { timeout } from './timeout';
export { rateLimit } from './rate-limit';
```

#### II. 개방-폐쇄 원칙 (OCP)

확장에는 열려있고 수정에는 닫혀있는 인터페이스를 설계한다.

**MUST**:
- 핵심 로직은 인터페이스로 추상화한다
- 전략 패턴을 통해 행위를 확장 가능하게 한다
- 플러그인/미들웨어 확장 포인트를 제공한다

```typescript
// 확장 가능한 재시도 전략
export interface RetryStrategy {
  shouldRetry(error: Error, attempt: number): boolean;
  getDelay(attempt: number): number;
}

// 내장 전략
export class ExponentialBackoff implements RetryStrategy { ... }
export class LinearBackoff implements RetryStrategy { ... }

// 사용자 정의 전략 허용
export function retry<T>(
  fn: () => Promise<T>,
  options: { strategy?: RetryStrategy }
): Promise<T>;
```

#### III. 리스코프 치환 원칙 (LSP)

추상화 계층 간 대체 가능성을 보장한다.

**MUST**:
- 인터페이스를 구현한 모든 클래스는 동일한 계약을 준수한다
- 서브타입은 기반 타입의 행위를 위반하지 않는다
- NestJS 어댑터는 core 인터페이스를 완전히 구현한다

```typescript
// Core 인터페이스
export interface ITracer {
  startSpan(name: string): ISpan;
  getCurrentSpan(): ISpan | undefined;
}

// 모든 구현체는 동일한 계약 준수
export class InMemoryTracer implements ITracer { ... }
export class OpenTelemetryTracer implements ITracer { ... }
export class NestJSTracerService implements ITracer { ... }
```

#### IV. 인터페이스 분리 원칙 (ISP)

세분화된 인터페이스로 의존성을 최소화한다.

**MUST**:
- 거대한 인터페이스보다 작고 집중된 인터페이스를 선호한다
- 클라이언트가 사용하지 않는 메서드에 의존하지 않도록 한다
- 선택적 기능은 별도 인터페이스로 분리한다

```typescript
// 나쁜 예: 거대한 인터페이스
interface ICache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): CacheStats;
  subscribe(event: string): void;
}

// 좋은 예: 분리된 인터페이스
interface IReadableCache {
  get(key: string): Promise<unknown>;
}

interface IWritableCache {
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

interface IObservableCache {
  getStats(): CacheStats;
  subscribe(event: string): void;
}

// 조합하여 사용
type ICache = IReadableCache & IWritableCache;
```

#### V. 의존성 역전 원칙 (DIP)

NestJS DI 시스템과 호환되는 추상화를 제공한다.

**MUST**:
- 고수준 모듈은 저수준 모듈에 의존하지 않고, 둘 다 추상화에 의존한다
- Injection Token을 통해 의존성을 주입받는다
- `forRoot`/`forRootAsync` 패턴으로 설정을 주입받는다

```typescript
// 추상화 정의
export const RETRY_OPTIONS = Symbol('RETRY_OPTIONS');
export interface RetryModuleOptions {
  maxAttempts: number;
  strategy: RetryStrategy;
}

// NestJS 모듈
@Module({})
export class RetryModule {
  static forRoot(options: RetryModuleOptions): DynamicModule {
    return {
      module: RetryModule,
      providers: [
        { provide: RETRY_OPTIONS, useValue: options },
        RetryService,
      ],
      exports: [RetryService],
    };
  }

  static forRootAsync(options: RetryModuleAsyncOptions): DynamicModule {
    return {
      module: RetryModule,
      imports: options.imports,
      providers: [
        {
          provide: RETRY_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        RetryService,
      ],
      exports: [RetryService],
    };
  }
}
```

### 2.2 추상화 전략

#### Framework-agnostic Core + NestJS Adapter 패턴

모든 라이브러리는 다음 계층 구조를 따른다:

```
packages/{library-name}/
├── src/
│   ├── core/           # Framework-agnostic 순수 로직
│   │   ├── interfaces/ # 추상화 인터페이스
│   │   ├── impl/       # 기본 구현체
│   │   └── index.ts    # core exports
│   ├── nestjs/         # NestJS 어댑터 (선택적)
│   │   ├── module.ts
│   │   ├── decorators.ts
│   │   └── index.ts
│   └── index.ts        # 통합 exports
```

**원칙**:
1. `core/`는 어떤 프레임워크에도 의존하지 않는다
2. `nestjs/`는 `core/`에만 의존한다
3. 사용자는 `core/`만 사용하거나 `nestjs/`와 함께 사용할 수 있다

```typescript
// 사용 예시 1: 순수 TypeScript
import { retry } from '@npm-library/retry/core';

// 사용 예시 2: NestJS와 함께
import { RetryModule } from '@npm-library/retry/nestjs';
```

#### 인터페이스 우선 설계

모든 public API는 인터페이스로 시작한다.

**절차**:
1. 인터페이스 정의 (계약)
2. 테스트 작성 (계약 검증)
3. 구현체 작성 (계약 이행)
4. NestJS 어댑터 작성 (프레임워크 통합)

### 2.3 NestJS-Fastify 패턴

#### Fastify 플러그인 통합

Fastify 플러그인 시스템과 NestJS를 연결하는 표준 패턴:

```typescript
// Fastify 플러그인 등록을 위한 데코레이터
export function FastifyPlugin(plugin: FastifyPluginCallback): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(FASTIFY_PLUGIN, plugin, target);
  };
}

// NestJS 모듈에서 Fastify 플러그인 등록
@Module({})
export class SomeModule implements OnModuleInit {
  constructor(
    @Inject(FASTIFY_INSTANCE)
    private readonly fastify: FastifyInstance,
  ) {}

  async onModuleInit() {
    await this.fastify.register(somePlugin);
  }
}
```

#### NestJS 모듈 시스템 활용

**MUST**:
- 모든 기능은 NestJS 모듈로 캡슐화한다
- Global 모듈 사용을 최소화한다 (명시적 import 선호)
- `forRoot`/`forRootAsync` 패턴으로 설정을 주입받는다

**데코레이터 설계 규칙**:
- 데코레이터는 메타데이터 설정만 담당한다
- 로직은 Guard, Interceptor, Pipe에서 처리한다
- 데코레이터 합성(composition)을 지원한다

```typescript
// 데코레이터 합성 예시
export function Retryable(options?: RetryOptions) {
  return applyDecorators(
    SetMetadata(RETRY_OPTIONS, options),
    UseInterceptors(RetryInterceptor),
  );
}
```

---

## 3. 품질 기준

### 3.1 코드 품질

#### TypeScript 설정

**MUST**:
- `strict: true` 필수
- `noUncheckedIndexedAccess: true` 권장
- ES2022 타겟, ESM 모듈 시스템

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

#### Linting 표준

**MUST**:
- ESLint + Prettier 사용
- `@typescript-eslint/recommended` 규칙셋 적용
- 순환 의존성(circular dependency) 금지

**권장 ESLint 규칙**:
```json
{
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "import/no-cycle": "error"
  }
}
```

### 3.2 테스트 요구사항

#### 커버리지 목표

| 테스트 유형 | 최소 커버리지 | 설명 |
|------------|-------------|------|
| 단위 테스트 | 80% | 개별 함수/클래스 테스트 |
| 통합 테스트 | 70% | 모듈 간 상호작용 테스트 |
| E2E 테스트 | 주요 시나리오 | Fastify inject 활용 |

#### 테스트 구조

```
packages/{library-name}/
├── test/
│   ├── unit/           # 단위 테스트
│   ├── integration/    # 통합 테스트
│   └── e2e/            # E2E 테스트 (NestJS 모듈 포함 시)
```

#### NestJS 테스트 패턴

```typescript
// 통합 테스트 예시
describe('RetryModule', () => {
  let module: TestingModule;
  let service: RetryService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [RetryModule.forRoot({ maxAttempts: 3 })],
    }).compile();

    service = module.get(RetryService);
  });

  it('should retry failed operations', async () => {
    // ...
  });
});
```

### 3.3 문서화 기준

#### README.md 필수 섹션

모든 패키지 README.md는 다음 섹션을 포함해야 한다:

1. **Installation**: 설치 방법
2. **Quick Start**: 5분 내 시작 가능한 예제
3. **API Reference**: 모든 public API 문서
4. **NestJS Integration**: NestJS 모듈 사용법 (해당 시)
5. **Use Cases**: 실제 사용 시나리오
6. **Migration Guide**: 버전 업그레이드 가이드

#### TSDoc 주석

모든 public API에 TSDoc 주석 필수:

```typescript
/**
 * 주어진 함수를 재시도합니다.
 *
 * @param fn - 실행할 비동기 함수
 * @param options - 재시도 옵션
 * @returns 함수 실행 결과
 * @throws {@link RetryError} 모든 재시도 실패 시
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetchData(),
 *   { maxAttempts: 3 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T>;
```

#### CLAUDE.md 작성 규칙

각 패키지는 CLAUDE.md를 포함하여 AI 어시스턴트에게 컨텍스트를 제공한다:

```markdown
# {패키지명}

## WHAT: 이 라이브러리가 하는 일
{핵심 기능 1-2문장}

## WHY: 존재 이유
{해결하는 문제, NestJS-Fastify에서의 pain point}

## HOW: 주요 명령어
{빌드, 테스트, 개발 명령어}

## 구조
{디렉토리 구조 설명}

## 핵심 개념
{라이브러리의 핵심 추상화 설명}
```

### 3.4 성능 기준

#### 번들 사이즈 제한

| 패키지 유형 | 최대 사이즈 (minified + gzipped) |
|------------|-------------------------------|
| Core only | 10KB |
| Core + NestJS adapter | 15KB |
| Full bundle | 20KB |

#### Tree-shaking 필수

**MUST**:
- 모든 export는 named export 사용 (default export 금지)
- Side effect 없는 모듈 구조 (`"sideEffects": false`)
- Sub-path exports 지원

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

#### 런타임 오버헤드 최소화

**MUST**:
- 지연 로딩(lazy loading) 활용
- 불필요한 런타임 의존성 제거
- 핫 패스(hot path)에서 동기 작업 최소화

---

## 4. 의존성 정책

### 4.1 내부 의존성

#### 단방향 의존성 그래프

패키지 간 의존성은 반드시 단방향이어야 한다:

```
허용:
@npm-library/retry → @npm-library/timeout
@npm-library/rate-limit → @npm-library/common-types

금지:
@npm-library/retry ↔ @npm-library/timeout (양방향)
```

#### 공유 타입 패키지

여러 패키지에서 공유하는 타입은 별도 패키지로 분리:

```
packages/
├── common-types/    # 공유 타입 정의만
├── retry/           # common-types에 의존
└── timeout/         # common-types에 의존
```

#### peerDependencies 활용

**MUST**:
- NestJS, Fastify는 항상 peerDependencies로 선언
- 버전 범위를 넓게 지정하여 호환성 유지

```json
{
  "peerDependencies": {
    "@nestjs/common": "^9.0.0 || ^10.0.0 || ^11.0.0",
    "@nestjs/core": "^9.0.0 || ^10.0.0 || ^11.0.0",
    "fastify": "^4.0.0 || ^5.0.0"
  }
}
```

### 4.2 외부 의존성

#### NestJS/Fastify 버전 호환성 매트릭스

| 라이브러리 버전 | NestJS | Fastify | Node.js |
|---------------|--------|---------|---------|
| 1.x | 9.x, 10.x | 4.x | 18.x, 20.x |
| 2.x | 10.x, 11.x | 4.x, 5.x | 20.x, 22.x |

#### 허용되는 외부 라이브러리 기준

**허용**:
- Zero-dependency 라이브러리 우선
- 명확한 단일 책임을 가진 라이브러리
- 활발히 유지보수되는 라이브러리 (최근 6개월 내 릴리스)
- MIT, Apache-2.0, BSD 라이선스

**금지**:
- Lodash 전체 번들 (개별 함수 패키지는 허용)
- 네이티브 바인딩이 필요한 라이브러리 (특별한 사유 없이)
- 폐기(deprecated) 또는 유지보수 중단된 라이브러리

#### dependencies vs devDependencies

| 분류 | dependencies | devDependencies |
|-----|--------------|-----------------|
| 런타임에 필요 | ✅ | ❌ |
| 빌드 시에만 필요 | ❌ | ✅ |
| 타입 정의 (@types/*) | ❌ | ✅ |
| 테스트 프레임워크 | ❌ | ✅ |

### 4.3 버전 관리

#### Semantic Versioning 2.0 준수

| 버전 유형 | 변경 내용 | 예시 |
|----------|----------|------|
| MAJOR | 호환되지 않는 API 변경 | 함수 시그니처 변경, 기능 제거 |
| MINOR | 후방 호환 기능 추가 | 새 옵션 추가, 새 함수 추가 |
| PATCH | 버그 수정 | 로직 오류 수정, 타입 오류 수정 |

#### Breaking Change 처리 절차

1. GitHub Issue에 RFC(Request for Comments) 작성
2. 최소 2주간 커뮤니티 피드백 수집
3. Migration guide 작성
4. Deprecation warning 추가 (1개 MINOR 버전)
5. MAJOR 버전에서 변경 적용

#### Changeset 작성 규칙

```bash
pnpm changeset
```

**메시지 형식**:
```markdown
---
"@npm-library/retry": minor
---

feat: 커스텀 재시도 전략 지원 추가

- `RetryStrategy` 인터페이스를 통해 사용자 정의 전략 구현 가능
- 기본 제공 전략: `ExponentialBackoff`, `LinearBackoff`
```

---

## 5. 운영 규칙

### 5.1 패키지 생성 절차

#### 1단계: RFC 문서 작성

새 패키지 제안 시 다음 내용을 포함한 RFC 작성:

```markdown
# RFC: {패키지명}

## 해결하려는 문제
{NestJS-Fastify에서 겪는 구체적인 pain point}

## 제안하는 해결책
{라이브러리 접근 방식}

## API 설계 (초안)
{주요 함수/클래스 시그니처}

## 대안 검토
{기존 솔루션이 부적합한 이유}

## 추출 기준 충족 여부
- [ ] 재사용성: 2개 이상의 프로젝트에서 활용 가능
- [ ] 독립성: 비즈니스 로직과 분리 가능
- [ ] 일반성: 특정 도메인에 종속되지 않음
- [ ] 안정성: 프로덕션에서 검증됨
- [ ] 단순성: 명확한 입출력 인터페이스
```

#### 2단계: 스펙 문서 승인

`/speckit.specify` 명령으로 상세 스펙 작성 후 리뷰

#### 3단계: 패키지 스캐폴딩

```bash
# 표준 패키지 구조 생성
pnpm create-package {package-name}
```

생성되는 구조:
```
packages/{package-name}/
├── src/
│   ├── core/
│   │   ├── interfaces/
│   │   ├── impl/
│   │   └── index.ts
│   ├── nestjs/
│   │   ├── module.ts
│   │   └── index.ts
│   └── index.ts
├── test/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── CLAUDE.md
```

#### 4단계: 초기 릴리스 체크리스트

- [ ] 모든 테스트 통과 (커버리지 80% 이상)
- [ ] TypeScript strict 모드 오류 없음
- [ ] ESLint 경고 없음
- [ ] README.md 필수 섹션 완료
- [ ] CLAUDE.md 작성 완료
- [ ] TSDoc 주석 완료
- [ ] 번들 사이즈 기준 충족
- [ ] Tree-shaking 동작 확인
- [ ] Changeset 작성
- [ ] PR 리뷰 완료

### 5.2 기여 가이드라인

#### 브랜치 명명 규칙

```
{issue-number}-{feature-name}

예시:
42-add-retry-strategy
123-fix-timeout-cleanup
```

#### 커밋 메시지

Conventional Commits 형식, 한글 작성:

```
feat: 커스텀 재시도 전략 지원 추가
fix: 타임아웃 정리 시 메모리 누수 수정
docs: API 레퍼런스 문서 보강
refactor: 내부 상태 관리 로직 개선
test: 엣지 케이스 테스트 추가
chore: 의존성 업데이트
```

#### PR 템플릿

```markdown
## 변경 사항
{무엇을 변경했는지}

## 변경 이유
{왜 변경했는지}

## 테스트
{어떻게 테스트했는지}

## 체크리스트
- [ ] 테스트 추가/수정
- [ ] 문서 업데이트
- [ ] Changeset 작성
- [ ] Breaking change 여부 확인
```

#### 리뷰 프로세스

1. PR 생성 시 자동으로 CI 실행
2. 최소 1명의 승인 필요
3. 모든 CI 체크 통과 필수
4. Squash merge 사용

### 5.3 릴리스 정책

#### 자동화된 릴리스 파이프라인

```yaml
# GitHub Actions
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: changesets/action@v1
        with:
          publish: pnpm release
```

#### npm 배포 전 체크리스트

- [ ] 모든 테스트 통과
- [ ] 빌드 성공
- [ ] Changeset 버전 확인
- [ ] CHANGELOG.md 생성 확인
- [ ] Git tag 생성 확인

#### 핫픽스 vs 정규 릴리스

| 유형 | 브랜치 | 프로세스 |
|-----|--------|---------|
| 정규 | main | PR → Review → Merge → Auto Release |
| 핫픽스 | hotfix/* | PR (긴급) → 1인 Review → Merge → Manual Release |

### 5.4 Deprecation 정책

#### 유예 기간

- 최소 2개 MINOR 버전 동안 deprecation warning 유지
- 중요 기능의 경우 1개 MAJOR 버전 유예

#### Migration Guide 필수 제공

모든 breaking change에는 migration guide 포함:

```markdown
# v1.x에서 v2.x로 마이그레이션

## Breaking Changes

### `retry` 함수 시그니처 변경

Before:
```typescript
retry(fn, maxAttempts)
```

After:
```typescript
retry(fn, { maxAttempts })
```

### 마이그레이션 방법
...
```

#### 경고 메시지 표준

```typescript
/**
 * @deprecated v2.0.0에서 제거 예정. 대신 `retryWithStrategy`를 사용하세요.
 */
export function retry(...): Promise<T> {
  console.warn(
    '[@npm-library/retry] retry()는 v2.0.0에서 제거됩니다. ' +
    'retryWithStrategy()를 사용해 주세요. ' +
    '마이그레이션 가이드: https://...'
  );
  // ...
}
```

---

## 6. 예외 처리

### 헌법 위반 시 대응 절차

1. **발견**: 코드 리뷰, CI 검사, 또는 이슈 리포트를 통해 위반 발견
2. **분류**: 위반 심각도 분류
   - Critical: 보안, 데이터 손실 위험
   - Major: 원칙 위반, 품질 저하
   - Minor: 스타일, 문서화 미비
3. **조치**:
   - Critical: 즉시 수정, 필요시 릴리스 철회
   - Major: 다음 릴리스 전 수정 필수
   - Minor: 백로그에 등록, 점진적 개선

### 예외 승인 절차

헌법 원칙을 준수할 수 없는 특수한 상황:

1. 예외 사유를 GitHub Issue에 문서화
2. 기술적 정당성 설명
3. 대안 검토 결과 명시
4. 2인 이상의 승인
5. 예외 사항을 코드 주석 및 문서에 명시

---

## 부록

### A. 패키지 템플릿

```
packages/{package-name}/
├── src/
│   ├── core/
│   │   ├── interfaces/
│   │   │   └── {feature}.interface.ts
│   │   ├── impl/
│   │   │   └── {feature}.ts
│   │   ├── errors/
│   │   │   └── {feature}.error.ts
│   │   └── index.ts
│   ├── nestjs/
│   │   ├── {feature}.module.ts
│   │   ├── {feature}.service.ts
│   │   ├── {feature}.decorator.ts
│   │   └── index.ts
│   └── index.ts
├── test/
│   ├── unit/
│   │   └── {feature}.test.ts
│   ├── integration/
│   │   └── {feature}.integration.test.ts
│   └── fixtures/
│       └── {feature}.fixture.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── CLAUDE.md
```

### B. 체크리스트 모음

#### 새 패키지 체크리스트

- [ ] RFC 승인됨
- [ ] 스펙 문서 완료
- [ ] 패키지 구조 표준 준수
- [ ] SOLID 원칙 적용 확인
- [ ] Framework-agnostic core 분리
- [ ] 테스트 커버리지 80% 이상
- [ ] 문서화 완료
- [ ] 번들 사이즈 기준 충족

#### PR 리뷰 체크리스트

- [ ] 헌법 원칙 준수
- [ ] TypeScript strict 모드 통과
- [ ] 테스트 추가/수정
- [ ] 문서 업데이트
- [ ] Changeset 작성

#### 릴리스 체크리스트

- [ ] 모든 CI 통과
- [ ] Changelog 확인
- [ ] 버전 번호 확인
- [ ] npm 배포 성공
- [ ] Git tag 생성

### C. 용어 정의

| 용어 | 정의 |
|-----|------|
| **Core** | Framework에 의존하지 않는 순수 로직 계층 |
| **Adapter** | Framework와 Core를 연결하는 계층 |
| **RFC** | Request for Comments, 새 기능/패키지 제안 문서 |
| **Breaking Change** | 기존 API와 호환되지 않는 변경 |
| **peerDependency** | 사용자가 직접 설치해야 하는 의존성 |
| **Tree-shaking** | 사용하지 않는 코드를 번들에서 제거하는 최적화 |

---

**Version**: 2.0.0 | **Ratified**: 2025-12-04 | **Last Amended**: 2025-12-05
