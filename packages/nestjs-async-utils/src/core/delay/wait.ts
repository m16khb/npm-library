import {AbortError} from '../errors/abort-error.js';
import type {WaitOptions} from './types.js';

/**
 * 지정된 시간만큼 대기하는 함수
 *
 * @description
 * 안전하고 취소 가능한 대기 함수입니다.
 * - 타이머 정리: 완료/취소 시 자동으로 clearTimeout
 * - 메모리 누수 방지: AbortSignal 리스너 자동 정리
 * - 레이스 컨디션 방지: settled 플래그로 중복 실행 차단
 *
 * @param ms - 대기 시간 (밀리초)
 * @param options - 옵션
 * @returns Promise<void>
 *
 * @throws {AbortError} signal이 abort된 경우
 * @throws {Error} ms가 음수인 경우
 *
 * @example
 * // 기본 사용법
 * await wait(1000); // 1초 대기
 *
 * @example
 * // AbortSignal과 함께
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 500);
 * await wait(1000, { signal: controller.signal }); // 0.5초 후 AbortError
 *
 * @example
 * // unref 옵션 (Node.js)
 * await wait(1000, { unref: true }); // 프로세스 종료를 막지 않음
 */
export function wait(ms: number, options?: WaitOptions): Promise<void>;

/**
 * 지정된 시간만큼 대기 후 값을 반환하는 함수
 *
 * @param ms - 대기 시간 (밀리초)
 * @param value - 반환할 값
 * @param options - 옵션
 * @returns Promise<T>
 *
 * @example
 * const result = await wait(1000, 'done'); // 1초 후 'done' 반환
 */
export function wait<T>(ms: number, value: T, options?: Omit<WaitOptions, 'value'>): Promise<T>;

/**
 * wait 함수 구현
 */
export function wait<T = void>(
  ms: number,
  valueOrOptions?: T | WaitOptions,
  maybeOptions?: Omit<WaitOptions, 'value'>,
): Promise<T | void> {
  // 인자 파싱
  let value: T | undefined;
  let options: WaitOptions | undefined;

  if (
    valueOrOptions !== undefined &&
    typeof valueOrOptions === 'object' &&
    valueOrOptions !== null
  ) {
    // wait(ms, options) 형태
    if ('signal' in valueOrOptions || 'unref' in valueOrOptions || 'value' in valueOrOptions) {
      options = valueOrOptions as WaitOptions;
      value = options.value as T | undefined;
    } else {
      // wait(ms, value) 형태 (value가 객체인 경우)
      value = valueOrOptions as T;
      options = maybeOptions;
    }
  } else if (valueOrOptions !== undefined) {
    // wait(ms, value) 형태 (value가 primitive인 경우)
    value = valueOrOptions as T;
    options = maybeOptions;
  }

  const {signal, unref = false} = options || {};

  // 유효성 검사
  if (ms < 0) {
    return Promise.reject(new Error('Wait time must be non-negative'));
  }

  // 0ms인 경우 즉시 resolve (마이크로태스크 큐로)
  if (ms === 0) {
    if (signal?.aborted) {
      return Promise.reject(createAbortError(signal));
    }
    return Promise.resolve(value as T | void);
  }

  return new Promise<T | void>((resolve, reject) => {
    // 레이스 컨디션 방지를 위한 상태 플래그
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // 정리 함수 - 메모리 누수 방지
    const cleanup = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
    };

    // AbortSignal 핸들러
    const handleAbort = (): void => {
      if (settled) return; // 레이스 컨디션 방지
      settled = true;
      cleanup();
      reject(createAbortError(signal));
    };

    // 이미 취소된 경우 즉시 reject
    if (signal?.aborted) {
      reject(createAbortError(signal));
      return;
    }

    // 타이머 설정
    timeoutId = setTimeout(() => {
      if (settled) return; // 레이스 컨디션 방지
      settled = true;
      cleanup();
      resolve(value as T | void);
    }, ms);

    // Node.js unref 옵션
    if (unref && typeof (timeoutId as any).unref === 'function') {
      (timeoutId as any).unref();
    }

    // AbortSignal 리스너 등록
    if (signal) {
      signal.addEventListener('abort', handleAbort, {once: true});
    }
  });
}

/**
 * AbortError 생성 헬퍼
 */
function createAbortError(signal?: AbortSignal): AbortError {
  const reason = signal?.reason;
  if (reason instanceof Error) {
    return new AbortError(reason.message, reason);
  }
  return new AbortError(reason ? String(reason) : 'Wait was aborted');
}

/**
 * 조건이 충족될 때까지 대기하는 함수
 *
 * @param condition - 조건 함수
 * @param options - 옵션
 * @returns Promise<void>
 *
 * @example
 * let ready = false;
 * setTimeout(() => ready = true, 1000);
 * await waitUntil(() => ready); // ready가 true가 될 때까지 대기
 */
export async function waitUntil(
  condition: () => boolean | Promise<boolean>,
  options: {
    interval?: number;
    timeout?: number;
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  const {interval = 50, timeout, signal} = options;

  const startTime = Date.now();

  while (true) {
    // 취소 확인
    if (signal?.aborted) {
      throw createAbortError(signal);
    }

    // 조건 확인
    const result = await condition();
    if (result) {
      return;
    }

    // 타임아웃 확인
    if (timeout !== undefined && Date.now() - startTime >= timeout) {
      throw new Error(`waitUntil timed out after ${timeout}ms`);
    }

    // 인터벌 대기
    await wait(interval, {signal});
  }
}

/**
 * 지정된 횟수만큼 반복하며 대기하는 함수
 *
 * @param count - 반복 횟수
 * @param ms - 각 반복 간 대기 시간
 * @param callback - 각 반복마다 실행할 콜백
 * @param options - 옵션
 *
 * @example
 * await waitFor(5, 1000, (i) => console.log(`Tick ${i}`));
 * // 1초 간격으로 5번 출력
 */
export async function waitFor(
  count: number,
  ms: number,
  callback?: (iteration: number) => void | Promise<void>,
  options?: {signal?: AbortSignal},
): Promise<void> {
  const {signal} = options || {};

  for (let i = 0; i < count; i++) {
    // 취소 확인
    if (signal?.aborted) {
      throw createAbortError(signal);
    }

    // 콜백 실행
    if (callback) {
      await callback(i);
    }

    // 마지막 반복이 아니면 대기
    if (i < count - 1) {
      await wait(ms, {signal});
    }
  }
}
