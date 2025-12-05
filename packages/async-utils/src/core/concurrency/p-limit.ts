import {AbortError} from '../errors/abort-error';
import {withAbortSignal} from '../utils/abort-utils';
import {PriorityQueue} from './priority-queue';
import type {LimitFunction, LimitTaskOptions, QueueItem, ConcurrencyState} from './types';

/**
 * 동시성 제한 함수 생성
 * @param concurrency 최대 동시 실행 수
 * @returns LimitFunction
 */
export function pLimit(concurrency: number): LimitFunction {
  if (concurrency < 1) {
    throw new Error('Concurrency must be at least 1');
  }

  const queue = new PriorityQueue();
  let activeCount = 0;
  let processedCount = 0;
  let currentConcurrency = concurrency;
  let nextId = 0;
  let sequenceCounter = 0; // FIFO 순서 보장용 순차 카운터

  const limitFunction = async function <T>(
    fn: () => Promise<T>,
    options: LimitTaskOptions = {},
  ): Promise<T> {
    const itemId = `item-${++nextId}`;
    const sequence = ++sequenceCounter; // Date.now() 대신 순차 카운터 사용 (FIFO 보장)

    // 기본 옵션 설정
    const finalOptions = {
      priority: options.priority ?? 5,
      signal: options.signal ?? undefined,
      id: options.id ?? itemId,
    };

    return new Promise<T>((resolve, reject) => {
      const queueItem: QueueItem<T> = {
        fn,
        resolve,
        reject,
        options: finalOptions,
        timestamp: sequence, // 순차 카운터로 FIFO 순서 보장
        id: finalOptions.id,
      };

      // 취소 신호 처리
      if (finalOptions.signal) {
        if (finalOptions.signal.aborted) {
          const error = new AbortError('Operation was aborted before execution');
          reject(error);
          return;
        }

        finalOptions.signal.addEventListener(
          'abort',
          () => {
            // 큐에서 제거 시도
            const removedItem = queue.removeById(queueItem.id);
            if (removedItem) {
              removedItem.reject(new AbortError('Operation was aborted while queued'));
            }
            // 이미 실행 중인 경우는 AbortSignal이 함수 실행 시 처리됨
          },
          {once: true},
        );
      }

      // 큐에 추가
      queue.enqueue(queueItem);

      // 다음 작업 실행 시도
      processQueue();
    });
  } as LimitFunction;

  // 현재 실행 중인 작업 수 getter
  Object.defineProperty(limitFunction, 'activeCount', {
    get: () => activeCount,
    enumerable: true,
    configurable: false,
  });

  // 대기 중인 작업 수 getter
  Object.defineProperty(limitFunction, 'pendingCount', {
    get: () => queue.size,
    enumerable: true,
    configurable: false,
  });

  // 동시성 설정 메서드
  limitFunction.setConcurrency = (newConcurrency: number): void => {
    if (newConcurrency < 1) {
      throw new Error('Concurrency must be at least 1');
    }

    const oldConcurrency = currentConcurrency;
    currentConcurrency = newConcurrency;

    // 동시성이 늘어난 경우 추가 작업 실행
    if (newConcurrency > oldConcurrency) {
      processQueue();
    }
  };

  // 큐 비우기 메서드
  limitFunction.clearQueue = (): void => {
    const items = queue.toArray();
    queue.clear();

    // 모든 대기 중인 작업을 AbortError로 reject
    items.forEach(item => {
      item.reject(new AbortError('Operation was cancelled due to queue clearing'));
    });
  };

  // 상태 정보 getter
  limitFunction.getState = (): ConcurrencyState => ({
    concurrency: currentConcurrency,
    active: activeCount,
    pending: queue.size,
    processed: processedCount,
    queue: queue.toArray().map(item => item.id),
  });

  /**
   * 큐에서 작업을 꺼내 실행
   */
  function processQueue(): void {
    // 동시성 제한에 도달했거나 큐가 비어있으면 종료
    if (activeCount >= currentConcurrency || queue.isEmpty) {
      return;
    }

    // 다음 작업 가져오기
    const item = queue.dequeue();
    if (!item) {
      return;
    }

    activeCount++;

    // 작업 실행
    (async () => {
      try {
        // AbortSignal과 함께 작업 실행
        const result = await withAbortSignal(item.fn(), item.options.signal || undefined);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        activeCount--;
        processedCount++;

        // 다음 작업 실행 시도
        processQueue();
      }
    })();
  }

  return limitFunction;
}

/**
 * Promise 배열을 동시성 제한하며 실행
 * @param tasks 작업 배열
 * @param concurrency 최대 동시 실행 수
 * @returns 모든 작업 결과 배열
 */
export async function pLimitAll<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const limit = pLimit(concurrency);

  return Promise.all(tasks.map(task => limit(task)));
}

/**
 * Promise 배열을 동시성 제한하며 실행하며 결과를 수집
 * @param tasks 작업 배열
 * @param concurrency 최대 동시 실행 수
 * @returns 결과 배열 (성공/실패 포함)
 */
export async function pLimitSettled<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<Array<{status: 'fulfilled'; value: T} | {status: 'rejected'; reason: any}>> {
  const limit = pLimit(concurrency);

  return Promise.allSettled(tasks.map(task => limit(task)));
}
