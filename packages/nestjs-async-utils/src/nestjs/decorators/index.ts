/**
 * NestJS Async Utils - 데코레이터
 *
 * ## 데코레이터 실행 순서
 *
 * TypeScript 데코레이터는 아래에서 위로 실행됩니다.
 * 권장 사용 순서:
 *
 * ```typescript
 * @ConcurrencyLimit(5)    // 3번째 실행 (가장 바깥) - 동시성 슬롯 확보
 * @Retryable({ retries: 3 }) // 2번째 실행 - 재시도 로직
 * @Timeout(5000)          // 1번째 실행 (가장 안쪽) - 각 시도에 타임아웃
 * async myMethod() {}
 * ```
 *
 * ### 실행 흐름:
 * 1. **ConcurrencyLimit**: 동시성 슬롯을 확보할 때까지 대기
 * 2. **Retryable**: 슬롯 확보 후 실행, 실패 시 재시도
 * 3. **Timeout**: 각 시도(재시도 포함)에 개별 타임아웃 적용
 *
 * ### 왜 이 순서인가?
 * - 동시성 제한이 가장 바깥에 있어야 재시도 시에도 슬롯을 유지
 * - 타임아웃이 가장 안쪽에 있어야 각 시도마다 개별 타임아웃 적용
 * - 재시도가 중간에 있어야 타임아웃된 시도를 재시도 가능
 */

export {Retryable} from './retryable.decorator.js';
export {Timeout} from './timeout.decorator.js';
export {ConcurrencyLimit} from './concurrency-limit.decorator.js';
