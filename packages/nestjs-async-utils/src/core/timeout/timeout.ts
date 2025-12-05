import {TimeoutError} from '../errors/timeout-error';
import {AbortError} from '../errors/abort-error';
import {checkAborted, withAbortSignal as withAbortSignalUtil} from '../utils/abort-utils';
import type {TimeoutOptions} from './types';

/**
 * Promise에 타임아웃을 적용하는 함수
 * @param promise 타임아웃을 적용할 Promise
 * @param milliseconds 타임아웃 시간 (밀리초)
 * @param fallback 타임아웃 시 반환할 기본값 (선택사항)
 * @returns 타임아웃이 적용된 Promise
 */
export function pTimeout<T>(promise: Promise<T>, milliseconds: number, fallback?: any): Promise<T>;

/**
 * Promise에 타임아웃을 적용하는 함수 (옵션 객체)
 * @param promise 타임아웃을 적용할 Promise
 * @param options 타임아웃 옵션
 * @returns 타임아웃이 적용된 Promise
 */
export function pTimeout<T>(promise: Promise<T>, options: TimeoutOptions): Promise<T>;

/**
 * Promise에 타임아웃을 적용하는 함수 (오버로드 구현)
 * @param promise 타임아웃을 적용할 Promise
 * @param optionsOrMilliseconds 타임아웃 옵션 또는 시간
 * @param fallback 기본값 (시간을 사용할 때)
 * @returns 타임아웃이 적용된 Promise
 */
export async function pTimeout<T>(
  promise: Promise<T>,
  optionsOrMilliseconds: TimeoutOptions | number,
  fallback?: any,
): Promise<T> {
  // 옵션 파싱
  const options: TimeoutOptions =
    typeof optionsOrMilliseconds === 'number'
      ? {milliseconds: optionsOrMilliseconds, fallback}
      : optionsOrMilliseconds;

  const {
    milliseconds,
    fallback: providedFallback,
    signal,
    onTimeout,
    cleanup,
    onSuccess,
    onError,
  } = options;

  const startTime = Date.now();

  // 정리 가능한 타임아웃 생성
  const {promise: timeoutPromise, clear: clearTimeout} = createClearableTimeout(
    milliseconds,
    onTimeout,
  );

  try {
    // 취소 신호 확인
    checkAborted(signal);

    // 원본 Promise와 타임아웃 Promise 경쟁
    const result = await Promise.race([
      signal ? withAbortSignalUtil(promise, signal) : promise,
      signal ? withAbortSignalUtil(timeoutPromise, signal) : timeoutPromise,
    ]);

    // 성공 시 타이머 정리 (리소스 누수 방지)
    clearTimeout();

    // 성공 콜백 호출
    if (onSuccess) {
      const duration = Date.now() - startTime;
      onSuccess(result, duration);
    }

    return result;
  } catch (error) {
    // 에러 시에도 타이머 정리
    clearTimeout();
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const duration = Date.now() - startTime;

    // 타임아웃 에러이고 fallback이 있는 경우
    if (errorObj instanceof TimeoutError && providedFallback !== undefined) {
      if (onTimeout) {
        onTimeout(`Timeout after ${milliseconds}ms`);
      }

      if (onError) {
        onError(errorObj, duration);
      }

      return providedFallback;
    }

    // 실패 콜백 호출 (AbortError나 TimeoutError가 아닌 경우)
    if (onError && !(errorObj instanceof AbortError) && !(errorObj instanceof TimeoutError)) {
      onError(errorObj, duration);
    }

    // 정리 함수 실행
    if (cleanup) {
      try {
        await cleanup();
      } catch (cleanupError) {
        // 정리 함수 에러는 무시하고 원본 에러를 던짐
        console.warn('Cleanup function failed:', cleanupError);
      }
    }

    throw errorObj;
  }
}

/**
 * 정리 가능한 타임아웃 Promise 생성
 * @param milliseconds 타임아웃 시간
 * @param onTimeout 타임아웃 콜백
 * @returns 타임아웃 Promise와 정리 함수
 */
function createClearableTimeout(
  milliseconds: number,
  onTimeout?: (reason: string) => void,
): {promise: Promise<never>; clear: () => void} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let cleared = false;

  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (cleared) return;
      const error = new TimeoutError(`Operation timed out after ${milliseconds}ms`, milliseconds);

      if (onTimeout) {
        onTimeout(`Timeout after ${milliseconds}ms`);
      }

      reject(error);
    }, milliseconds);

    // Node.js의 unref()가 있으면 사용 (프로세스 종료 방지)
    if ((timeoutId as any).unref) {
      (timeoutId as any).unref();
    }
  });

  const clear = () => {
    cleared = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return {promise, clear};
}

/**
 * 여러 Promise에 타임아웃을 적용
 * @param promises Promise 배열
 * @param milliseconds 타임아웃 시간
 * @returns 모든 Promise 결과 또는 타임아웃 에러
 */
export function pTimeoutAll<T>(promises: Promise<T>[], milliseconds: number): Promise<T[]> {
  const timeoutPromises = promises.map(promise => pTimeout(promise, {milliseconds}));

  return Promise.all(timeoutPromises);
}

/**
 * 여러 Promise에 타임아웃을 적용하고 Promise.allSettled 사용
 * @param promises Promise 배열
 * @param milliseconds 타임아웃 시간
 * @returns 모든 Promise 결과 (성공/실패 포함)
 */
export function pTimeoutSettled<T>(
  promises: Promise<T>[],
  milliseconds: number,
): Promise<Array<{status: 'fulfilled'; value: T} | {status: 'rejected'; reason: any}>> {
  const timeoutPromises = promises.map(promise => pTimeout(promise, {milliseconds}));

  return Promise.allSettled(timeoutPromises);
}
