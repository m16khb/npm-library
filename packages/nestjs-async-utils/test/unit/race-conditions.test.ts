import { describe, it, expect, vi } from 'vitest';
import { pLimit, pTimeout, retry } from '../../src/core';
import { AbortError, TimeoutError } from '../../src/core';

// 지연 헬퍼
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Race Condition Safety Tests', () => {

  describe('pLimit Concurrency Safety', () => {

    it('SC-003: should maintain concurrency limit with 1000 concurrent tasks', async () => {
      const limit = pLimit(5);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const tasks = Array.from({ length: 1000 }, (_, i) =>
        limit(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

          // 짧은 랜덤 지연
          await delay(Math.random() * 5);

          currentConcurrent--;
          return i;
        })
      );

      await Promise.all(tasks);

      // 동시성 제한이 항상 준수되어야 함
      expect(maxConcurrent).toBeLessThanOrEqual(5);
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);
    });

    it('should maintain FIFO order with sequence counter', async () => {
      const limit = pLimit(1);
      const executionOrder: number[] = [];

      // 100개 작업을 빠르게 등록
      const tasks = Array.from({ length: 100 }, (_, i) =>
        limit(async () => {
          executionOrder.push(i);
          return i;
        })
      );

      await Promise.all(tasks);

      // FIFO 순서가 보장되어야 함
      expect(executionOrder).toEqual(Array.from({ length: 100 }, (_, i) => i));
    });

    it('should handle clearQueue during active task execution', async () => {
      const limit = pLimit(2);
      const results: string[] = [];
      const errors: Error[] = [];

      // 100개 작업 제출
      const tasks = Array.from({ length: 100 }, (_, i) =>
        limit(async () => {
          await delay(10);
          results.push(`task-${i}`);
          return i;
        }).catch(e => {
          errors.push(e);
          return -1;
        })
      );

      // 5ms 후 clearQueue 호출 (일부 작업 실행 중)
      await delay(5);
      limit.clearQueue();

      await Promise.all(tasks);

      // 상태 일관성 검증
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);

      // 취소된 작업은 AbortError
      errors.forEach(e => {
        expect(e).toBeInstanceOf(AbortError);
      });

      // 일부 작업은 성공, 나머지는 취소됨
      expect(results.length + errors.length).toBe(100);
    });

    it('should handle setConcurrency during task execution', async () => {
      const limit = pLimit(2);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const tasks = Array.from({ length: 50 }, (_, i) =>
        limit(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

          // 중간에 동시성 변경
          if (i === 10) {
            limit.setConcurrency(5);
          }
          if (i === 30) {
            limit.setConcurrency(1);
          }

          await delay(5);
          currentConcurrent--;
          return i;
        })
      );

      await Promise.all(tasks);

      // 동시성 변경 후에도 상태 일관성 유지
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);
    });

    it('should handle rapid abort calls without state corruption', async () => {
      const limit = pLimit(3);
      const controllers = Array.from({ length: 50 }, () => new AbortController());
      const results: Array<'success' | 'aborted'> = [];

      const tasks = controllers.map((controller, i) =>
        limit(
          async () => {
            await delay(20);
            return i;
          },
          { signal: controller.signal }
        ).then(() => {
          results.push('success');
        }).catch(e => {
          if (e instanceof AbortError) {
            results.push('aborted');
          } else {
            throw e;
          }
        })
      );

      // 빠른 연속 abort 호출
      for (let i = 0; i < 30; i++) {
        setTimeout(() => controllers[i].abort(), Math.random() * 10);
      }

      await Promise.all(tasks);

      // 상태 일관성 검증
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);
      expect(results.length).toBe(50);
    });
  });

  describe('pTimeout Resource Cleanup', () => {

    it('should clean up timer when promise resolves quickly', async () => {
      const results: number[] = [];

      // 빠르게 완료되는 Promise에 긴 타임아웃 적용
      for (let i = 0; i < 100; i++) {
        const fastPromise = Promise.resolve(i);
        const result = await pTimeout(fastPromise, 10000);
        results.push(result);
      }

      // 모든 타이머가 정리되었는지 간접 검증 (타이머 누수 시 느려짐)
      expect(results.length).toBe(100);
    });

    it('should handle concurrent timeouts without interference', async () => {
      const results: Array<'success' | 'timeout'> = [];

      const tasks = Array.from({ length: 50 }, (_, i) => {
        const promise = new Promise<number>(resolve => {
          setTimeout(() => resolve(i), i % 2 === 0 ? 5 : 50);
        });

        return pTimeout(promise, 25)
          .then(() => results.push('success'))
          .catch(e => {
            if (e instanceof TimeoutError) {
              results.push('timeout');
            } else {
              throw e;
            }
          });
      });

      await Promise.all(tasks);

      expect(results.length).toBe(50);
      expect(results.filter(r => r === 'success').length).toBeGreaterThan(0);
      expect(results.filter(r => r === 'timeout').length).toBeGreaterThan(0);
    });
  });

  describe('retry Timing Safety', () => {

    it('should handle rapid retries without state corruption', async () => {
      let callCount = 0;

      const result = await retry(
        async () => {
          callCount++;
          if (callCount < 5) {
            throw new Error(`Attempt ${callCount} failed`);
          }
          return 'success';
        },
        {
          attempts: 10,
          strategy: () => 1, // 1ms 지연
        }
      );

      expect(result).toBe('success');
      expect(callCount).toBe(5);
    });

    it('should handle concurrent retry operations independently', async () => {
      const results: string[] = [];

      const tasks = Array.from({ length: 20 }, (_, i) => {
        let attempts = 0;

        return retry(
          async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error(`Task ${i} attempt ${attempts} failed`);
            }
            return `task-${i}`;
          },
          {
            attempts: 5,
            strategy: () => 1,
          }
        ).then(result => {
          results.push(result);
        });
      });

      await Promise.all(tasks);

      expect(results.length).toBe(20);
      results.forEach((result, i) => {
        expect(results).toContain(`task-${i}`);
      });
    });

    it('should handle abort during retry delay', async () => {
      const controller = new AbortController();
      let attempts = 0;

      const retryPromise = retry(
        async () => {
          attempts++;
          throw new Error('Always fails');
        },
        {
          attempts: 10,
          signal: controller.signal,
          strategy: () => 100, // 100ms 지연
        }
      );

      // 첫 번째 시도 후 abort
      await delay(10);
      controller.abort();

      await expect(retryPromise).rejects.toThrow(AbortError);
      expect(attempts).toBe(1);
    });
  });

  describe('Combined Operations Safety', () => {

    it('should handle retry + timeout + concurrency together', async () => {
      const limit = pLimit(3);
      const results: Array<'success' | 'retry-exhausted' | 'timeout'> = [];

      const tasks = Array.from({ length: 30 }, (_, i) => {
        let attempts = 0;

        return limit(async () => {
          const result = await pTimeout(
            retry(
              async () => {
                attempts++;
                // 일부는 성공, 일부는 계속 실패
                if (i % 3 === 0 || attempts >= 2) {
                  return `task-${i}`;
                }
                throw new Error('Temporary failure');
              },
              {
                attempts: 3,
                strategy: () => 5,
              }
            ),
            50 // 50ms 타임아웃
          );
          return result;
        }).then(() => {
          results.push('success');
        }).catch(e => {
          if (e instanceof TimeoutError) {
            results.push('timeout');
          } else {
            results.push('retry-exhausted');
          }
        });
      });

      await Promise.all(tasks);

      expect(results.length).toBe(30);
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);
    });

    it('should propagate abort signal across all layers', async () => {
      const limit = pLimit(2);
      const controller = new AbortController();
      const abortedTasks: number[] = [];

      const tasks = Array.from({ length: 20 }, (_, i) =>
        limit(
          async () => {
            await pTimeout(
              retry(
                async () => {
                  await delay(50);
                  return i;
                },
                {
                  attempts: 3,
                  signal: controller.signal,
                  strategy: () => 10,
                }
              ),
              {
                milliseconds: 200,
                signal: controller.signal,
              }
            );
            return i;
          },
          { signal: controller.signal }
        ).catch(e => {
          if (e instanceof AbortError) {
            abortedTasks.push(i);
          }
          return -1;
        })
      );

      // 10ms 후 abort
      await delay(10);
      controller.abort();

      await Promise.all(tasks);

      // 대부분의 작업이 abort되어야 함
      expect(abortedTasks.length).toBeGreaterThan(10);
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);
    });
  });

  describe('Stress Tests', () => {

    it('should handle 100 rapid sequential operations', async () => {
      const limit = pLimit(5);

      for (let round = 0; round < 10; round++) {
        const tasks = Array.from({ length: 100 }, (_, i) =>
          limit(async () => {
            await delay(1);
            return i;
          })
        );

        const results = await Promise.all(tasks);
        expect(results.length).toBe(100);
        expect(limit.activeCount).toBe(0);
        expect(limit.pendingCount).toBe(0);
      }
    });

    it('should maintain consistency under concurrent state queries', async () => {
      const limit = pLimit(5);
      const stateSnapshots: Array<{ active: number; pending: number }> = [];

      // 작업과 상태 조회를 동시에 수행
      const workTasks = Array.from({ length: 100 }, (_, i) =>
        limit(async () => {
          await delay(Math.random() * 10);
          return i;
        })
      );

      const queryTask = (async () => {
        for (let i = 0; i < 50; i++) {
          stateSnapshots.push({
            active: limit.activeCount,
            pending: limit.pendingCount,
          });
          await delay(2);
        }
      })();

      await Promise.all([...workTasks, queryTask]);

      // 모든 스냅샷에서 activeCount는 동시성 제한 이하여야 함
      stateSnapshots.forEach(snapshot => {
        expect(snapshot.active).toBeLessThanOrEqual(5);
        expect(snapshot.active).toBeGreaterThanOrEqual(0);
        expect(snapshot.pending).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
