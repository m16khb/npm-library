# npm-library

npm 라이브러리 모음 모노레포

## WHAT: 기술 스택

- **패키지 매니저**: pnpm 9.14.2 (workspace)
- **빌드 시스템**: Turborepo
- **언어**: TypeScript 5.7 (ES2022, ESM)
- **버전 관리**: Changesets

## WHY: 프로젝트 목적

npm에 배포할 개별 라이브러리들을 관리하는 모노레포. 각 패키지는 독립적으로 빌드/배포 가능.

## HOW: 주요 명령어

```bash
pnpm build      # 전체 빌드
pnpm dev        # 개발 모드 (watch)
pnpm typecheck  # 타입 체크
pnpm clean      # 빌드 결과물 삭제
pnpm changeset  # 변경사항 기록
pnpm release    # 배포 (build + publish)
```

## 구조

```
npm-library/
├── packages/           # 개별 라이브러리 패키지
├── turbo.json          # Turborepo 설정
├── tsconfig.base.json  # 공유 TypeScript 설정
└── pnpm-workspace.yaml # pnpm workspace 설정
```

## 하위 모듈

| 모듈                                                         | 버전   | 설명                                      |
| ------------------------------------------------------------ | ------ | ----------------------------------------- |
| [nestjs-traceable](packages/nestjs-traceable/CLAUDE.md)     | 1.3.3  | TraceId 기반 분산 추적 라이브러리         |
| [nestjs-async-utils](packages/nestjs-async-utils/CLAUDE.md) | 1.0.5  | NestJS 비동기 유틸리티 데코레이터         |
| [nestjs-sidequest](packages/nestjs-sidequest/CLAUDE.md)     | 0.1.2  | NestJS Sidequest.js 통합 (DB 기반 Job 큐) |

## Active Technologies

- **TypeScript 5.7+** (ES2022, strict mode)
- **Node.js**: 20+ (traceable, async-utils), 22.6.0+ (sidequest)
- **NestJS**: 10.x / 11.x 호환

## Recent Changes

- **nestjs-sidequest (v0.1.2)**: Sidequest.js 통합 패키지 추가 (LGPL v3)
- **nestjs-traceable (v1.3.3)**: Error.cause 체인 추적 기능 추가
- **nestjs-async-utils (v1.0.5)**: 서브패스 export 지원 (/core, /nestjs, /retry, /timeout, /concurrency)
