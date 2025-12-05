import type {RetryStrategy} from './types.js';

/**
 * 지수 백오프 전략
 * @param baseDelay 기본 지연 시간 (밀리초, 기본값: 100)
 * @param maxDelay 최대 지연 시간 (밀리초, 기본값: 10000)
 * @param multiplier 증가 배수 (기본값: 2)
 * @returns RetryStrategy
 */
export function exponentialBackoff(
  baseDelay: number = 100,
  maxDelay: number = 10000,
  multiplier: number = 2,
): RetryStrategy {
  return (attempt: number): number => {
    const delay = baseDelay * Math.pow(multiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  };
}

/**
 * 선형 백오프 전략
 * @param delay 고정 지연 시간 (밀리초, 기본값: 1000)
 * @returns RetryStrategy
 */
export function linearBackoff(delay: number = 1000): RetryStrategy {
  return (): number => delay;
}

/**
 * 고정 지연 전략 (linearBackoff의 별칭)
 * @param delay 고정 지연 시간 (밀리초, 기본값: 1000)
 * @returns RetryStrategy
 */
export const fixedDelay = linearBackoff;

/**
 * 지터(jitter)를 추가한 지수 백오프 전략
 * @param baseDelay 기본 지연 시간 (밀리초, 기본값: 100)
 * @param maxDelay 최대 지연 시간 (밀리초, 기본값: 10000)
 * @param multiplier 증가 배수 (기본값: 2)
 * @param jitter 지터 범위 (0-1, 기본값: 0.1)
 * @returns RetryStrategy
 */
export function exponentialBackoffWithJitter(
  baseDelay: number = 100,
  maxDelay: number = 10000,
  multiplier: number = 2,
  jitter: number = 0.1,
): RetryStrategy {
  return (attempt: number): number => {
    const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
    const jitterRange = exponentialDelay * jitter;
    const jitterAmount = Math.random() * jitterRange;
    const delay = exponentialDelay + jitterAmount;
    return Math.min(delay, maxDelay);
  };
}

/**
 * 증가 지연 전략
 * @param initialDelay 초기 지연 시간 (밀리초, 기본값: 100)
 * @param increment 증가량 (밀리초, 기본값: 100)
 * @param maxDelay 최대 지연 시간 (밀리초, 기본값: 10000)
 * @returns RetryStrategy
 */
export function incrementalBackoff(
  initialDelay: number = 100,
  increment: number = 100,
  maxDelay: number = 10000,
): RetryStrategy {
  return (attempt: number): number => {
    const delay = initialDelay + (attempt - 1) * increment;
    return Math.min(delay, maxDelay);
  };
}

// 기본 전략 내보내기
export const defaultRetryStrategy = exponentialBackoff(100, 10000, 2);
