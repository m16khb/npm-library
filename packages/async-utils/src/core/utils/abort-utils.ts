import {AbortError} from '../errors/abort-error.js';

/**
 * AbortSignal이 이미 취소되었는지 확인하고 취소되었다면 에러를 던집니다
 */
export function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortError('Operation was aborted');
  }
}

/**
 * AbortSignal이 이미 취소되었는지 확인하고 취소되었다면 reason을 포함한 에러를 던집니다
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const reason =
      signal.reason instanceof Error ? signal.reason : (signal.reason ?? 'Operation was aborted');

    throw new AbortError(
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason : undefined,
    );
  }
}

/**
 * 취소 가능한 지연 함수를 생성합니다
 */
export function createAbortableDelay(
  ms: number,
  signal?: AbortSignal,
  customMessage?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 취소된 경우 즉시 reject
    if (signal?.aborted) {
      // customMessage가 있으면 우선적으로 사용
      if (customMessage) {
        reject(new AbortError(customMessage));
        return;
      }

      const reason = signal?.reason || 'Delay was aborted';
      reject(
        new AbortError(
          reason instanceof Error ? reason.message : String(reason),
          reason instanceof Error ? reason : undefined,
        ),
      );
      return;
    }

    // eslint-disable-next-line prefer-const
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (signal && timeoutId) {
        signal.removeEventListener('abort', onAbort);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const onAbort = () => {
      cleanup();

      // customMessage가 있으면 우선적으로 사용
      if (customMessage) {
        reject(new AbortError(customMessage));
        return;
      }

      const reason = signal?.reason;
      const message = reason instanceof Error ? reason.message : 'Delay was aborted';
      reject(new AbortError(message, reason instanceof Error ? reason : undefined));
    };

    timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    // AbortSignal 리스너 등록
    if (signal) {
      signal.addEventListener('abort', onAbort, {once: true});
    }
  });
}

/**
 * AbortSignal과 Promise를 결합하여 취소 가능한 Promise를 생성합니다
 */
export function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    // 이미 취소된 경우
    if (signal.aborted) {
      reject(new AbortError(signal?.reason || 'Operation was aborted'));
      return;
    }

    let settled = false;

    const cleanup = () => {
      if (!settled) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new AbortError(signal?.reason || 'Operation was aborted'));
    };

    // 원본 Promise 처리
    promise
      .then(value => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      })
      .catch(error => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      });

    // AbortSignal 리스너 등록
    signal.addEventListener('abort', onAbort, {once: true});
  });
}

/**
 * AbortSignal을 Promise로 변환합니다
 */
export function signalToPromise(signal?: AbortSignal, customMessage?: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!signal) {
      resolve();
      return;
    }

    if (signal.aborted) {
      // customMessage가 있으면 우선적으로 사용
      if (customMessage) {
        reject(new AbortError(customMessage));
        return;
      }

      const reason = signal?.reason || 'Signal is already aborted';
      reject(
        new AbortError(
          reason instanceof Error ? reason.message : String(reason),
          reason instanceof Error ? reason : undefined,
        ),
      );
      return;
    }

    const onAbort = () => {
      // customMessage가 있으면 우선적으로 사용
      if (customMessage) {
        reject(new AbortError(customMessage));
        return;
      }

      const reason = signal?.reason;
      const message = reason instanceof Error ? reason.message : 'Operation was aborted';
      reject(new AbortError(message, reason instanceof Error ? reason : undefined));
    };

    signal.addEventListener('abort', onAbort, {once: true});
  });
}

/**
 * 자동으로 AbortController를 생성하고 관리하는 유틸리티 함수
 */
export async function withAutoAbortController<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const signal = controller.signal;

  try {
    const result = await fn(signal);
    controller.abort();
    return result;
  } catch (error) {
    controller.abort();
    throw error;
  }
}
