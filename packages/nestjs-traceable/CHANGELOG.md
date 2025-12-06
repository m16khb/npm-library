# @m16khb/nestjs-traceable

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
