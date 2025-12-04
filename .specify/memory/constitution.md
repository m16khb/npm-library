<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0 (initial adoption)
- Added sections: Core Principles (5 principles), Development Standards, Library Extraction Criteria
- Templates requiring updates: ✅ N/A (first-time setup)
- Follow-up TODOs: None
-->

# NPM Library Constitution

## Core Principles

### I. Library-First Design
모든 기능은 독립형 라이브러리로 시작해야 합니다. 라이브러리는 자체 포함되고, 독립적으로 테스트 가능하며, 문서화가 완료되어야 합니다. 조직 내부용이 아닌 명확한 목적이 필요합니다.

### II. Framework Agnostic
라이브러리는 특정 프레임워크에 종속되지 않아야 합니다. NestJS/Fastify에서 추출된 기능이라도 순수 TypeScript/Node.js 환경에서 동작할 수 있도록 추상화해야 합니다. 의존성 주입을 통한 적응 계층을 허용합니다.

### III. API Stability
공개 API는 시맨틱 버전 관리를 엄격히 따릅니다. MAJOR 버전은 호환되지 않는 변경, MINOR 버전은 후방 호환 기능 추가, PATCH 버전은 버그 수정에 사용합니다. deprecated 기능은 최소 2개 MAJOR 버전 동안 유지됩니다.

### IV. Comprehensive Testing
모든 라이브러리는 100% 테스트 커버리지를 목표로 합니다. 단위 테스트, 통합 테스트, E2E 테스트를 포함해야 합니다. 타입 정의는 테스트의 일부로 간주하며, TypeScript strict 모드가 필수입니다.

### V. Documentation Driven
코드보다 문서가 우선입니다. 모든 공개 API는 JSDoc 주석과 사용 예제를 포함해야 합니다. README.md에는 Quickstart, API Reference, Use Case, Migration Guide 섹션이 필수입니다.

## Library Extraction Criteria

NestJS/Fastify 백엔드에서 라이브러리로 추출할 기능의 기준:

1. **재사용성**: 2개 이상의 프로젝트에서 활용 가능한 기능
2. **독립성**: 비즈니스 로직과 분리될 수 있는 순수 기술적 기능
3. **일반성**: 특정 도메인에 종속되지 않은 범용적 해결책
4. **안정성**: 프로덕션 환경에서 검증된 안정적인 구현
5. **단순성**: 명확한 입출력 인터페이스를 가진 단일 책임 기능

## Development Standards

모든 개발은 TypeScript strict 모드로 진행됩니다. ES2022를 타겟으로 하며, ESM 모듈 시스템을 사용합니다. 빌드 결과물은 CommonJS와 ESM을 모두 지원해야 합니다.

코드 스타일은 Prettier와 ESLint를 통해 자동 정리됩니다. 커밋 메시지는 Conventional Commits规范을 따릅니다.

## Governance

헌법은 모든 다른 관행보다 우선합니다. 수정 사항은 문서화, 승인, 이전 계획이 필요합니다. 모든 PR/리뷰는 헌법 준수 여부를 확인해야 합니다. 복잡성은 정당화되어야 합니다. 런타임 개발 가이드는 각 라이브러리의 GUIDELINE.md 파일을 참조합니다.

**Version**: 1.0.0 | **Ratified**: 2025-12-04 | **Last Amended**: 2025-12-04