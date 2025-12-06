# npm-library

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.14.2-orange.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-latest-blue.svg)](https://turbo.build/)

[English](https://github.com/m16khb/npm-library/blob/main/README.md) | [한국어](#)

pnpm workspace와 Turborepo로 관리하는 npm 라이브러리 모음 모노레포입니다.

## 패키지

| 패키지 | 버전 | 설명 |
|---------|---------|-------------|
| [@m16khb/nestjs-async-utils](./packages/nestjs-async-utils) | [![npm](https://img.shields.io/npm/v/@m16khb/nestjs-async-utils.svg)](https://www.npmjs.com/package/@m16khb/nestjs-async-utils) | NestJS 비동기 작업 제어 데코레이터 (@Retryable, @Timeout, @ConcurrencyLimit) |
| [@m16khb/nestjs-traceable](./packages/nestjs-traceable) | [![npm](https://img.shields.io/npm/v/@m16khb/nestjs-traceable.svg)](https://www.npmjs.com/package/@m16khb/nestjs-traceable) | NestJS용 traceId 기반 분산 추적 라이브러리 |

## 기술 스택

- **패키지 매니저**: pnpm 9.14.2 (workspace)
- **빌드 시스템**: Turborepo
- **언어**: TypeScript 5.7+ (ES2022, ESM)
- **버전 관리**: Changesets

## 구조

```
npm-library/
├── packages/              # 개별 라이브러리 패키지
│   ├── nestjs-async-utils/   # NestJS 비동기 유틸리티 데코레이터
│   └── nestjs-traceable/     # NestJS traceId 기반 분산 추적
├── specs/                 # 기능 스펙 문서
├── docs/                  # 공통 문서
├── turbo.json            # Turborepo 설정
├── tsconfig.base.json    # 공유 TypeScript 설정
└── pnpm-workspace.yaml   # pnpm workspace 설정
```

## 개발

```bash
# 의존성 설치
pnpm install

# 전체 빌드
pnpm build

# 개발 모드 (watch)
pnpm dev

# 테스트 실행
pnpm test

# 타입 체크
pnpm typecheck

# 빌드 결과물 삭제
pnpm clean
```

## 배포

```bash
# 변경사항 기록
pnpm changeset

# 버전 업데이트 및 배포
pnpm release
```

## 요구사항

- Node.js >= 20.0.0
- pnpm >= 9.0.0

## 라이선스

MIT
