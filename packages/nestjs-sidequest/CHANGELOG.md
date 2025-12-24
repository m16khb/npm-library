# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2024-12-24

### Breaking Changes

- `JobAddOptions.uniqueKey: string` → `unique: boolean` 변경
  - Sidequest.js API가 boolean만 지원하여 인터페이스 일치
- `JobAddOptions.metadata` 제거
  - Sidequest.js가 Job 생성 시 metadata를 지원하지 않음
- `JobInfo.metadata` 제거

### Fixed

- `forRootAsync()`에서 `useFactory`, `useClass`, `useExisting` 모두 없을 때 빈 객체 반환 → 에러 throw로 변경
- CLS context 유실 문제 수정 (async 콜백 올바르게 처리)

## [0.2.0] - 2024-12-24

### Added

- Bulk Job 청크 처리 기능 (`addBulk` 메서드)
- `DEFAULT_CHUNK_SIZE` 상수 (100)

### Fixed

- `chunkSize` 유효성 검증 추가
- 빈 배열 조기 반환 처리

## [0.1.2] - 2024-12-23

### Fixed

- 패키지 버전 업데이트

## [0.1.1] - 2024-12-23

### Fixed

- README.ko.md에서 '标记'를 '표시'로 수정

## [0.1.0] - 2024-12-23

### Added

- 초기 릴리스
- NestJS Sidequest.js 통합 패키지
- `@Processor`, `@OnJob`, `@Retry` 데코레이터
- `@OnJobComplete`, `@OnJobFailed` 이벤트 핸들러
- `@InjectQueue` 의존성 주입
- `SidequestModule.forRoot()` / `forRootAsync()` 모듈 설정
- CLS(Continuation Local Storage) 통합 지원
- PostgreSQL, MySQL, MongoDB, SQLite 백엔드 지원
