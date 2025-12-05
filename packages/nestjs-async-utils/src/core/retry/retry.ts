import {RetryError} from '../errors/retry-error.js';
import {AbortError} from '../errors/abort-error.js';
import {checkAborted, createAbortableDelay} from '../utils/abort-utils.js';
import type {RetryOptions, RetryState} from './types.js';
import {defaultRetryStrategy} from './strategies.js';

/**
 * 재시도 로직을 적용하는 함수
 * @param fn 재시도할 비동기 함수
 * @param options 재시도 옵션
 * @returns Promise<T>
 * @throws {RetryError} 최대 재시도 횟수를 초과한 경우
 * @throws {AbortError} 취소 신호가 있는 경우
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    attempts = 3,
    strategy = defaultRetryStrategy,
    retryIf = defaultRetryFilter,
    signal,
    onRetry,
    onSuccess,
    onError,
  } = options;

  const errors: Error[] = [];

  for (let attempt = 1; attempt <= attempts; attempt++) {
    // 취소 신호 확인
    checkAborted(signal);

    try {
      const result = await fn();

      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess(attempt, result);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // AbortError는 즉시 던짐 (재시도하지 않음)
      if (errorObj instanceof AbortError) {
        throw errorObj;
      }

      errors.push(errorObj);

      // 재시도 여부 확인
      if (attempt === attempts) {
        // 최대 재시도 횟수 초과
        if (onError) {
          const previousErrors = errors.slice(0, -1);
          onError(attempt, errorObj, previousErrors);
        }

        throw new RetryError(
          `Maximum retry attempts exceeded (${attempts}/${attempts})`,
          attempt,
          errorObj,
          errors,
        );
      }

      if (!retryIf(errorObj)) {
        // 필터에 의해 재시도 안 함
        if (onError) {
          const previousErrors = errors.slice(0, -1);
          onError(attempt, errorObj, previousErrors);
        }

        throw errorObj; // 원래 에러를 던짐
      }

      // 다음 재시도까지의 지연 시간 계산
      const delay = strategy(attempt, errorObj);

      // 재시도 콜백 호출
      if (onRetry) {
        onRetry(attempt, errorObj, delay);
      }

      // 지연 시간만큼 대기
      if (delay > 0) {
        await createAbortableDelay(delay, signal);
      }
    }
  }

  // 이 코드는 도달할 수 없지만 TypeScript를 위해 필요
  throw new RetryError('Unexpected retry failure', attempts, undefined, errors);
}

/**
 * 기본 재시도 필터
 * @param error 발생한 에러
 * @returns 재시도 여부
 */
export function defaultRetryFilter(error: Error): boolean {
  // AbortError는 재시도하지 않음
  if (error instanceof AbortError || error.constructor.name === 'AbortError') {
    return false;
  }

  // RetryError는 재시도하지 않음 (재귀 방지)
  if (error instanceof RetryError || error.constructor.name === 'RetryError') {
    return false;
  }

  // 일반적인 재시도 가능 에러들
  const retryableErrors = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
  ];

  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    507, // Insufficient Storage
    509, // Bandwidth Limit Exceeded
    520, // Unknown Error (Cloudflare)
    521, // Web Server Is Down (Cloudflare)
    522, // Connection Timed Out (Cloudflare)
    523, // Origin Is Unreachable (Cloudflare)
    524, // A Timeout Occurred (Cloudflare)
  ];

  // 에러 코드 확인
  if ('code' in error && typeof error.code === 'string') {
    return retryableErrors.includes(error.code);
  }

  // HTTP 상태 코드 확인 (fetch 응답 등)
  if ('status' in error && typeof error.status === 'number') {
    return retryableStatusCodes.includes(error.status);
  }

  // 기본적으로 재시도
  return true;
}

/**
 * 재시도 상태를 추적하는 함수
 * @param fn 재시도할 비동기 함수
 * @param options 재시도 옵션
 * @returns Promise<{ result: T, state: RetryState }>
 */
export async function retryWithState<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<{result: T; state: RetryState}> {
  const {
    attempts = 3,
    strategy = defaultRetryStrategy,
    retryIf = defaultRetryFilter,
    signal,
  } = options;

  let currentAttempt = 0;
  const errors: Error[] = [];

  const wrappedFn = async (): Promise<T> => {
    currentAttempt++;
    const remaining = attempts - currentAttempt;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errors.push(errorObj);

      if (currentAttempt < attempts && retryIf(errorObj)) {
        const delay = strategy(currentAttempt, errorObj);
        const state: RetryState = {
          attempt: currentAttempt,
          remaining,
          delay,
          errors: [...errors],
        };

        if (delay > 0) {
          await createAbortableDelay(delay, signal);
        }

        throw state;
      }

      throw errorObj;
    }
  };

  try {
    const result = await retry(wrappedFn, options);
    const state: RetryState = {
      attempt: currentAttempt,
      remaining: attempts - currentAttempt,
      delay: 0,
      errors: [...errors],
    };

    return {result, state};
  } catch (error) {
    // 마지막 상태 반환
    const state: RetryState = {
      attempt: currentAttempt,
      remaining: Math.max(0, attempts - currentAttempt),
      delay: 0,
      errors: [...errors],
    };

    // 항상 상태 정보와 함께 에러를 던짐
    throw {error: error instanceof Error ? error : new Error(String(error)), state};
  }
}
