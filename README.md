# npm-library

npm 라이브러리 모음 모노레포입니다.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@m16khb/nestjs-async-utils](./packages/nestjs-async-utils) | [![npm](https://img.shields.io/npm/v/@m16khb/nestjs-async-utils.svg)](https://www.npmjs.com/package/@m16khb/nestjs-async-utils) | NestJS 비동기 작업 제어 데코레이터 (@Retryable, @Timeout, @ConcurrencyLimit) |

## 구조

```
npm-library/
├── packages/
│   └── nestjs-async-utils/   # NestJS 비동기 유틸리티 데코레이터
├── specs/                     # 기능 스펙 문서
├── docs/                      # 공통 문서
└── README.md
```

## 개발

```bash
# 의존성 설치
pnpm install

# 전체 빌드
pnpm build

# 전체 테스트
pnpm test

# 타입 체크
pnpm typecheck
```

## 라이선스

MIT
