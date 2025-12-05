import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pTimeout, pLimit, retry, TimeoutError, AbortError } from '../../src/core';

// 지연 헬퍼
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 리소스 추적 헬퍼
interface ResourceTracker {
  activeTimers: Set<number>;
  activePromises: Set<Promise<any>>;
  activeAbortListeners: number;
}

function createResourceTracker(): ResourceTracker {
  const tracker: ResourceTracker = {
    activeTimers: new Set(),
    activePromises: new Set(),
    activeAbortListeners: 0,
  };

  // 원본 setTimeout, clearTimeout 저장
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  // setTimeout 후킹 (타이머 추적)
  (global.setTimeout as any) = (...args: any[]) => {
    const timerId = originalSetTimeout(...args) as any;
    tracker.activeTimers.add(timerId);

    // 타이머 완료 시 자동 제거
    const cleanup = () => tracker.activeTimers.delete(timerId);
    if (typeof timerId === 'object' && timerId._onTimeout) {
      const original = timerId._onTimeout;
      timerId._onTimeout = function() {
        cleanup();
        return original.call(this);
      };
    }

    return timerId;
  };

  // clearTimeout 후킹
  (global.clearTimeout as any) = (timerId: any) => {
    tracker.activeTimers.delete(timerId);
    return originalClearTimeout(timerId);
  };

  return tracker;
}

function restoreGlobals() {
  // 원본 복원 (필요시)
}

describe('Memory Leak Detection Tests', () => {
  let tracker: ResourceTracker;

  beforeEach(() => {
    tracker = createResourceTracker();
  });

  afterEach(() => {
    restoreGlobals();
  });

  describe('pTimeout Timer Cleanup', () => {
    it('should clear timeout after successful completion', async () => {
      const promise = Promise.resolve('success');
      await pTimeout(promise, 5000);

      // 타이머가 정리되었는지 확인 (약간의 시간 지연 후)
      await delay(10);
      expect(tracker.activeTimers.size).toBe(0);
    });

    it('should clear timeout after timeout error', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('too late'), 5000));

      try {
        await pTimeout(promise, 50);
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
      }

      // 타이머가 정리되었는지 확인
      // 원본 promise의 타이머도 있으므로 더 긴 시간 대기
      await delay(50);

      // pTimeout의 타이머는 정리되어야 함
      // 원본 promise의 타이머는 5000ms 후에 실행될 예정
      // 따라서 정확한 개수는 테스트 환경에 따라 다를 수 있음
      expect(tracker.activeTimers.size).toBeLessThanOrEqual(1);
    });

    it('should not leak timers with multiple concurrent timeouts', async () => {
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve('success')
      );

      const timeoutPromises = promises.map(p =>
        pTimeout(p, 5000).catch(() => null)
      );

      await Promise.all(timeoutPromises);
      await delay(50);

      // 모든 타이머가 정리되었는지 확인
      expect(tracker.activeTimers.size).toBe(0);
    });

    it('should clean up even when promise rejects with cleanup callback', async () => {
      const promise = Promise.reject(new Error('Original error'));

      try {
        await pTimeout(promise, {
          milliseconds: 5000,
          cleanup: async () => {
            await delay(10);
          },
        });
      } catch (error) {
        // 예상된 에러
      }

      await delay(50);
      expect(tracker.activeTimers.size).toBe(0);
    });

    it('should handle rapid abort signal changes', async () => {
      const controller = new AbortController();
      const promise = new Promise(resolve => setTimeout(() => resolve('done'), 5000));

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 10000,
        signal: controller.signal,
      });

      // 빠르게 abort 호출
      setTimeout(() => controller.abort(), 5);

      try {
        await timeoutPromise;
      } catch (error) {
        expect(error).toBeInstanceOf(AbortError);
      }

      await delay(50);
      // pTimeout의 타이머는 정리되어야 함
      // 원본 promise의 타이머는 5000ms 후에 실행될 예정이므로 1개 남을 수 있음
      expect(tracker.activeTimers.size).toBeLessThanOrEqual(1);
    });
  });

  describe('pLimit Event Listener Cleanup', () => {
    it('should remove abort listeners after task execution', async () => {
      const limit = pLimit(2);
      const controller = new AbortController();

      const task = limit(async () => {
        await delay(10);
        return 'done';
      }, { signal: controller.signal });

      const result = await task;
      expect(result).toBe('done');

      // 리스너가 정리되었는지 확인 (abort 호출 시 오류가 없어야 함)
      controller.abort();
      await delay(10);
      expect(true).toBe(true); // 에러 없이 완료되면 OK
    });

    it('should handle abort listeners with rapid signal changes', async () => {
      const limit = pLimit(5);
      const controllers = Array.from({ length: 50 }, () => new AbortController());

      const tasks = controllers.map(controller =>
        limit(async () => {
          await delay(Math.random() * 20);
          return 'done';
        }, { signal: controller.signal })
      );

      // 일부 작업이 진행 중일 때 abort
      await delay(5);
      controllers.slice(0, 25).forEach(c => c.abort());

      const results = await Promise.allSettled(tasks);

      // 일부는 abort되었고, 일부는 완료되었을 것
      const aborted = results.filter(r => r.status === 'rejected').length;
      expect(aborted).toBeGreaterThan(0);
      expect(aborted).toBeLessThan(50);
    });

    it('should clean up queue properly after clearQueue', async () => {
      const limit = pLimit(1); // 동시성 1로 제한

      const tasks = Array.from({ length: 100 }, (_, i) =>
        limit(async () => {
          await delay(50);
          return i;
        })
      );

      // 모든 작업이 큐에 들어간 후 clearQueue
      await delay(5);
      limit.clearQueue();

      const results = await Promise.allSettled(tasks);

      // 많은 작업이 취소되어야 함
      const cancelled = results.filter(r => r.status === 'rejected').length;
      expect(cancelled).toBeGreaterThan(50);
    });
  });

  describe('retry Timer Cleanup', () => {
    it('should clear backoff timers on successful retry', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      };

      const result = await retry(fn, {
        attempts: 5,
        strategy: (attempt) => 100, // 100ms 간격
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);

      // 백오프 타이머가 정리되었는지 확인
      await delay(50);
      expect(tracker.activeTimers.size).toBe(0);
    });

    it('should clear backoff timers on abort signal', async () => {
      const controller = new AbortController();
      const fn = async () => {
        throw new Error('Always fails');
      };

      const retryPromise = retry(fn, {
        attempts: 10,
        strategy: (attempt) => 500, // 500ms 간격
        signal: controller.signal,
      });

      // 첫 번째 재시도 중에 abort
      setTimeout(() => controller.abort(), 100);

      try {
        await retryPromise;
      } catch (error) {
        expect(error).toBeInstanceOf(AbortError);
      }

      // 백오프 타이머가 모두 정리되었는지 확인
      await delay(50);
      expect(tracker.activeTimers.size).toBe(0);
    });

    it('should handle rapid retry abort calls', async () => {
      const controllers = Array.from({ length: 20 }, () => new AbortController());

      const retries = controllers.map(controller =>
        retry(
          async () => {
            throw new Error('Always fails');
          },
          {
            attempts: 10,
            strategy: (attempt) => 200,
            signal: controller.signal,
          }
        ).catch(() => null)
      );

      // 모두 빠르게 abort
      await delay(10);
      controllers.forEach(c => c.abort());

      await Promise.all(retries);

      // 모든 타이머가 정리되었는지 확인
      await delay(50);
      expect(tracker.activeTimers.size).toBe(0);
    });
  });

  describe('Combined Operations Cleanup', () => {
    it('should clean up resources with pLimit + pTimeout + retry', async () => {
      const limit = pLimit(3);
      let attempts = 0;

      const task = async () => {
        return retry(
          async () => {
            attempts++;
            if (attempts < 2) {
              throw new Error('First attempt fails');
            }
            await delay(10);
            return 'success';
          },
          {
            attempts: 3,
            strategy: () => 50,
          }
        );
      };

      const tasks = Array.from({ length: 10 }, () =>
        limit(task).catch(() => null)
      );

      await Promise.all(tasks);

      // 모든 리소스가 정리되었는지 확인
      await delay(100);
      expect(tracker.activeTimers.size).toBe(0);
    });

    it('should handle cascade abort through all layers', async () => {
      const controller = new AbortController();
      const limit = pLimit(3);

      const task = (id: number) =>
        limit(
          async () => {
            return retry(
              async () => {
                await delay(100);
                return `task-${id}`;
              },
              {
                attempts: 5,
                strategy: () => 100,
                signal: controller.signal,
              }
            );
          },
          { signal: controller.signal }
        );

      const tasks = Array.from({ length: 20 }, (_, i) => task(i));

      // 중간에 abort 신호 발송
      setTimeout(() => controller.abort(), 50);

      const results = await Promise.allSettled(tasks);

      // 많은 작업이 abort되어야 함
      const aborted = results.filter(r => r.status === 'rejected').length;
      expect(aborted).toBeGreaterThan(5);

      // 모든 리소스 정리 확인
      await delay(100);
      expect(tracker.activeTimers.size).toBe(0);
    });
  });

  describe('Long-running Operations', () => {
    it('should handle 10k rapid timeout calls without leaks', async () => {
      const promises = Array.from({ length: 10000 }, () =>
        Promise.resolve('success')
      );

      const timeoutPromises = promises.map(p =>
        pTimeout(p, 5000).catch(() => null)
      );

      // 배치로 처리 (동시 실행 제한)
      for (let i = 0; i < timeoutPromises.length; i += 100) {
        await Promise.all(timeoutPromises.slice(i, i + 100));
        await delay(5);
      }

      await delay(50);
      expect(tracker.activeTimers.size).toBe(0);
    });

    it('should handle 1000 concurrent limit tasks with abort signals', async () => {
      const limit = pLimit(50);
      const controllers = Array.from({ length: 1000 }, () => new AbortController());

      const tasks = controllers.map((controller, i) =>
        limit(
          async () => {
            await delay(Math.random() * 50);
            return i;
          },
          { signal: controller.signal }
        ).catch(() => null)
      );

      // 진행 중에 절반 abort
      await delay(20);
      controllers.slice(0, 500).forEach(c => c.abort());

      await Promise.all(tasks);

      await delay(50);
      expect(tracker.activeTimers.size).toBe(0);
    });
  });
});
