/**
 * @npm-library/async-utils
 *
 * 비동기 작업 제어 라이브러리 - retry, timeout, concurrency control
 *
 * ## Core 사용 (Framework-agnostic)
 * ```typescript
 * import { retry, pTimeout, pLimit } from '@npm-library/async-utils/core';
 * ```
 *
 * ## NestJS 사용
 * ```typescript
 * import { AsyncUtilsModule, Retryable, Timeout, ConcurrencyLimit } from '@npm-library/async-utils/nestjs';
 * ```
 *
 * @packageDocumentation
 */

// Core exports - Framework-agnostic 순수 유틸리티
export * from './core/index.js';

// NestJS 통합은 별도 서브패스로 import
// import { ... } from '@npm-library/async-utils/nestjs';

// Note: NestJS 타입과 Core 타입의 이름 충돌을 피하기 위해
// NestJS exports는 루트에서 re-export 하지 않습니다.
// NestJS 사용자는 '@npm-library/async-utils/nestjs' 서브패스를 사용하세요.
