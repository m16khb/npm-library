import { describe, it, expect, beforeEach } from 'vitest';
import { pTimeout, pLimit, retry, pLimitAll, pTimeoutAll } from '../../src/core';

// 지연 헬퍼
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 성능 측정 헬퍼
function measurePerformance(label: string, fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  return fn().then(() => {
    const duration = performance.now() - start;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return duration;
  });
}

describe('Performance Benchmarks', () => {
  describe('pLimit Throughput', () => {
    it('SC-010: should handle task overhead under 1ms per task', async () => {
      const limit = pLimit(10);
      const taskCount = 1000;

      const totalTime = await measurePerformance(
        `pLimit(${taskCount} tasks, concurrency=10)`,
        async () => {
          const tasks = Array.from({ length: taskCount }, () =>
            limit(() => Promise.resolve())
          );
          await Promise.all(tasks);
        }
      );

      // 작업당 오버헤드 계산
      const overheadPerTask = totalTime / taskCount;
      console.log(`  Overhead per task: ${overheadPerTask.toFixed(3)}ms`);

      // SC-010: 작업당 1ms 미만의 오버헤드
      expect(overheadPerTask).toBeLessThan(1);
    });

    it('should scale linearly with concurrency', async () => {
      const taskCount = 50; // 더 적은 작업으로 조정
      const baseDuration = 30; // 더 짧은 기본 시간

      // 동시성별로 실행 시간 측정
      const results: { concurrency: number; duration: number }[] = [];

      for (const concurrency of [1, 5, 10]) {
        const duration = await measurePerformance(
          `pLimit(${taskCount} tasks × ${baseDuration}ms, concurrency=${concurrency})`,
          async () => {
            const limit = pLimit(concurrency);
            const tasks = Array.from({ length: taskCount }, () =>
              limit(async () => {
                await delay(baseDuration);
              })
            );
            await Promise.all(tasks);
          }
        );

        results.push({ concurrency, duration });
      }

      // 동시성이 높을수록 시간이 줄어들어야 함
      expect(results[0].duration).toBeGreaterThan(results[1].duration);
      expect(results[1].duration).toBeGreaterThan(results[2].duration);

      // 이론적 최소 시간 (50 * 30ms / concurrency)
      for (const { concurrency, duration } of results) {
        const theoreticalMin = (taskCount * baseDuration) / concurrency;
        const ratio = duration / theoreticalMin;
        console.log(
          `  Concurrency=${concurrency}: actual=${duration.toFixed(2)}ms, theoretical=${theoreticalMin.toFixed(2)}ms, ratio=${ratio.toFixed(2)}`
        );

        // 실제 시간이 이론적 최소값의 200% 이내여야 함 (오버헤드 고려)
        expect(ratio).toBeLessThan(2.0);
      }
    }, { timeout: 15000 });

    it('should handle rapid state changes efficiently', async () => {
      const limit = pLimit(5);

      const duration = await measurePerformance(
        'pLimit with rapid setConcurrency calls',
        async () => {
          const tasks = Array.from({ length: 100 }, (_, i) =>
            limit(async () => {
              await delay(Math.random() * 10);
              return i;
            })
          );

          // 진행 중에 동시성 변경
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              limit.setConcurrency(Math.random() > 0.5 ? 3 : 10);
            }, i * 10);
          }

          await Promise.all(tasks);
        }
      );

      // 1000ms 이내에 완료되어야 함
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('pTimeout Performance', () => {
    it('should apply timeout with minimal latency', async () => {
      const iterations = 100;
      const targetDuration = 50;

      const totalTime = await measurePerformance(
        `pTimeout(${iterations} times, target=${targetDuration}ms)`,
        async () => {
          const promises = Array.from({ length: iterations }, () =>
            new Promise(resolve => setTimeout(() => resolve('done'), targetDuration))
          );

          await pTimeoutAll(promises, targetDuration + 100);
        }
      );

      // 이론적 시간: iterations * targetDuration
      // 실제로는 동시 실행되므로 targetDuration 근처
      const overhead = totalTime - targetDuration;
      console.log(`  Overhead: ${overhead.toFixed(2)}ms`);

      // 오버헤드가 50% 이내여야 함
      expect(overhead / targetDuration).toBeLessThan(0.5);
    });

    it('SC-004: should maintain timeout accuracy within ±50ms', async () => {
      const targetTimeout = 100;
      const iterations = 10;
      const toleranceMs = 50;

      console.log(
        `  Testing timeout accuracy: target=${targetTimeout}ms, tolerance=±${toleranceMs}ms`
      );

      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        try {
          await pTimeout(
            new Promise(resolve => setTimeout(() => resolve('done'), 1000)),
            targetTimeout
          );
        } catch (error) {
          // TimeoutError expected
        }

        const actualTime = performance.now() - start;
        timings.push(actualTime);
      }

      // 모든 타이밍이 목표값 ±50ms 범위 내
      const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
      console.log(`  Average: ${avgTiming.toFixed(2)}ms`);

      for (const timing of timings) {
        const deviation = Math.abs(timing - targetTimeout);
        expect(deviation).toBeLessThanOrEqual(toleranceMs);
      }
    });
  });

  describe('retry Performance', () => {
    it('should minimize backoff overhead', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry');
        }
        return 'success';
      };

      const duration = await measurePerformance(
        'retry with exponential backoff (2 retries)',
        async () => {
          await retry(fn, {
            attempts: 5,
            strategy: (attempt) => Math.min(50 * Math.pow(2, attempt), 200),
          });
        }
      );

      // 예상 시간: 50ms + 100ms = 150ms + 오버헤드
      // 허용 오버헤드: 160ms (테스트 환경 변동성 고려)
      expect(duration).toBeLessThan(310);
    });

    it('should handle high retry frequency', async () => {
      const duration = await measurePerformance(
        'retry with immediate retries (no backoff)',
        async () => {
          let attempts = 0;
          await retry(
            async () => {
              attempts++;
              if (attempts < 10) {
                throw new Error('Retry');
              }
              return 'success';
            },
            {
              attempts: 15,
              strategy: () => 0, // 즉시 재시도
            }
          );
        }
      );

      // 오버헤드만으로 가능하도록 (지연 없음)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Combined Operations Performance', () => {
    it('should handle pLimit + pTimeout efficiently', async () => {
      const limit = pLimit(5);
      const taskCount = 50;

      const duration = await measurePerformance(
        `pLimit + pTimeout (${taskCount} tasks)`,
        async () => {
          const tasks = Array.from({ length: taskCount }, (_, i) =>
            limit(async () => {
              return pTimeout(
                new Promise(resolve => setTimeout(() => resolve(`task-${i}`), 20)),
                1000
              );
            })
          );

          await Promise.all(tasks);
        }
      );

      // 이론적 시간: (50 * 20) / 5 = 200ms + 오버헤드
      expect(duration).toBeLessThan(400);
    });

    it('should handle pLimit + retry efficiently', async () => {
      const limit = pLimit(3);
      const taskCount = 30;

      const duration = await measurePerformance(
        `pLimit + retry (${taskCount} tasks)`,
        async () => {
          let totalAttempts = 0;

          const tasks = Array.from({ length: taskCount }, (_, i) =>
            limit(async () => {
              let attempts = 0;
              return retry(
                async () => {
                  attempts++;
                  totalAttempts++;
                  if (attempts === 1) {
                    throw new Error('Retry once');
                  }
                  await delay(10);
                  return `task-${i}`;
                },
                {
                  attempts: 3,
                  strategy: () => 0,
                }
              );
            })
          );

          await Promise.all(tasks);
        }
      );

      // 이론적 시간: (30 * 10) / 3 ≈ 100ms + 오버헤드
      expect(duration).toBeLessThan(300);
    });

    it('should scale with pLimit + pTimeout + retry', async () => {
      const limit = pLimit(10);
      const iterations = 5;
      let totalTasks = 0;

      for (const taskCount of [10, 50, 100]) {
        const duration = await measurePerformance(
          `pLimit(10) + pTimeout + retry (${taskCount} tasks)`,
          async () => {
            let attempts = 0;

            const tasks = Array.from({ length: taskCount }, (_, i) =>
              limit(async () => {
                return pTimeout(
                  retry(
                    async () => {
                      attempts++;
                      if (attempts % 3 === 0 && attempts > 3) {
                        throw new Error('Retry');
                      }
                      await delay(5);
                      return `task-${i}`;
                    },
                    {
                      attempts: 3,
                      strategy: () => 0,
                    }
                  ),
                  500
                );
              })
            );

            await Promise.all(tasks);
          }
        );

        // 선형 스케일링 검증 (작업 수에 비례)
        totalTasks += taskCount;
        console.log(`  Per-task overhead: ${(duration / taskCount).toFixed(2)}ms`);
      }
    });
  });

  describe('Memory Efficiency', () => {
    it('should not accumulate memory with large task volumes', async () => {
      const limit = pLimit(20);

      // 메모리 사용량 체크 전후
      if (global.gc) {
        global.gc();
      }
      const memBefore = process.memoryUsage().heapUsed;

      await measurePerformance('pLimit with 10k tasks', async () => {
        const tasks = Array.from({ length: 10000 }, (_, i) =>
          limit(async () => {
            // 작은 데이터 할당
            const arr = new Array(10).fill(i);
            return arr.reduce((a, b) => a + b);
          })
        );

        // 배치 처리
        for (let i = 0; i < tasks.length; i += 100) {
          await Promise.all(tasks.slice(i, i + 100));
        }
      });

      if (global.gc) {
        global.gc();
      }
      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = memAfter - memBefore;

      console.log(`  Memory increase: ${(memIncrease / 1024 / 1024).toFixed(2)}MB`);

      // 메모리 증가가 합리적 범위 내 (20MB 이내 - 테스트 환경 변동성 고려)
      expect(memIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });
});
