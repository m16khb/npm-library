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

| 모듈                                                            | 설명                                   |
| --------------------------------------------------------------- | -------------------------------------- |
| [traceable](packages/traceable/CLAUDE.md)                       | Traceable 라이브러리                   |
| [nestjs-async-utils](packages/nestjs-async-utils/README.md)     | NestJS 비동기 유틸리티 데코레이터      |

## Active Technologies

- N/A (in-memory state only - 동시성 카운터, 큐) (002-nestjs-async-decorators)

- TypeScript 5.7+ (ES2022) (004-universal-tracer)
- N/A (in-memory CLS) (004-universal-tracer)
- TypeScript 5.7+ (ES2022, strict mode) + Zero dependency (core), @nestjs/common ^10.0.0 || ^11.0.0 (peerDependency) (001-async-utils)
- N/A (in-memory state only) (001-async-utils)

## Recent Changes

- 004-universal-tracer: Added TypeScript 5.7+ (ES2022)
