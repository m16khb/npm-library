# @m16khb/nestjs-traceable

## 1.2.0

### Minor Changes

- Error 처리 강화 및 Error.cause 체인 추적 기능 추가

  **새로운 기능:**
  - Error.cause 체인 자동 추적 및 로깅 (ES2022 지원)
  - Error 처리 유틸리티 함수 추가 (getErrorChain, getRootCause 등)
  - errorChain, rootCause 필드가 로그에 자동 포함

  **개선사항:**
  - error/fatal 메서드의 unknown 타입 안전 처리
  - SOLID 원칙을 따르는 순수 함수 기반 Error 유틸리티
  - Tree-shaking 최적화를 위한 모듈 구조

  **예시:**

  ```typescript
  const inner = new Error('Connection timeout');
  const outer = new Error('DB query failed', {cause: inner});
  logger.error('Transaction failed', outer);
  // 로그 출력:
  // - error: "DB query failed"
  // - errorChain: "DB query failed → Connection timeout"
  // - rootCause: "Connection timeout"
  ```

## 1.1.1

### Patch Changes

- TraceableLogger의 error/fatal 메서드가 unknown 타입 지원
  - catch 블록에서 발생하는 unknown 타입 에러를 직접 전달 가능
  - 타입 가드로 Error, 객체, 기타 타입을 자동 처리
  - 더 이상 `error as Error` 타입 캐스팅 불필요

## 1.1.0

### Minor Changes

- TraceContextService에 사용자 정의 값 저장/조회 기능 추가
  - `set<T>(key, value)`: 임의의 키-값 저장
  - `get<T>(key)`: 타입 안전한 값 조회
  - `has(key)`: 키 존재 여부 확인
  - `delete(key)`: 값 삭제

  이를 통해 traceId 외에도 userId, requestIp 등 요청 범위 컨텍스트 데이터를 자유롭게 관리할 수 있습니다.

## 1.0.1

### Patch Changes

- README 다국어 지원 추가 및 개선
  - 한국어/영어 버전 분리
  - 뱃지 추가 (npm, 라이선스, TypeScript, NestJS)
  - 일관된 문서 구조 구성
