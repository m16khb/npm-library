# @m16khb/traceable

Traceable 라이브러리 패키지

## 상위 문서

- [루트](../../CLAUDE.md)

## WHAT: 기술 스택

- **빌드**: tsup (ESM only)
- **언어**: TypeScript
- **출력**: dist/ (index.js, index.d.ts)

## WHY: 패키지 목적

Traceable Provider 기능을 제공하는 npm 라이브러리.

## HOW: 주요 명령어

```bash
pnpm build      # tsup 빌드
pnpm dev        # watch 모드
pnpm typecheck  # 타입 체크
pnpm clean      # dist/ 삭제
```

## 구조

```
traceable/
├── src/
│   └── index.ts    # 엔트리포인트
├── tsup.config.ts  # tsup 설정
└── tsconfig.json   # TypeScript 설정
```
