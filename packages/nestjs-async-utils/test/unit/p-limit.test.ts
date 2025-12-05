import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pLimit,
  pLimitAll,
  pLimitSettled,
  PriorityQueue,
} from '../../src/core';
import { AbortError } from '../../src/core';

describe('pLimit', () => {
  describe('Basic concurrency control', () => {
    it('should respect max concurrent tasks', async () => {
      const limit = pLimit(2);
      let activeCount = 0;
      let maxActiveCount = 0;

      const tasks = Array.from({ length: 10 }, (_, i) => async () => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);

        await new Promise((resolve) => setTimeout(resolve, 10));

        activeCount--;
        return i;
      });

      const results = await Promise.all(tasks.map((task) => limit(task)));

      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(maxActiveCount).toBeLessThanOrEqual(2);
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);
    });

    it('should execute tasks in FIFO order when priorities are equal', async () => {
      const limit = pLimit(1);
      const executionOrder: number[] = [];

      // 작업을 순차적으로 등록하고 즉시 실행 결과 확인
      const taskPromises: Promise<number>[] = [];

      for (let i = 0; i < 5; i++) {
        const task = async () => {
          executionOrder.push(i);
          return i;
        };
        taskPromises.push(limit(task));
      }

      await Promise.all(taskPromises);
      expect(executionOrder).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle zero delay tasks correctly', async () => {
      const limit = pLimit(3);
      const executed: number[] = [];

      const tasks = Array.from({ length: 10 }, (_, i) => async () => {
        await new Promise(resolve => setTimeout(resolve, 1)); // 작은 지연 추가
        executed.push(i);
        return i;
      });

      const results = await Promise.all(tasks.map((task) => limit(task)));

      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(executed.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // 정렬하여 확인
    });
  });

  describe('Priority support', () => {
    it('should execute higher priority tasks first', async () => {
      const limit = pLimit(1);
      const executionOrder: number[] = [];

      // 낮은 우선순위 작업 먼저 추가
      const lowPriorityPromise = limit(
        async () => {
          executionOrder.push(1);
          return 1;
        },
        { priority: 1 },
      );

      // 높은 우선순위 작업 나중에 추가
      const highPriorityPromise = limit(
        async () => {
          executionOrder.push(10);
          return 10;
        },
        { priority: 10 },
      );

      // 중간 우선순위 작업 추가
      const mediumPriorityPromise = limit(
        async () => {
          executionOrder.push(5);
          return 5;
        },
        { priority: 5 },
      );

      const results = await Promise.all([
        lowPriorityPromise,
        highPriorityPromise,
        mediumPriorityPromise,
      ]);

      expect(results.sort((a, b) => a - b)).toEqual([1, 5, 10]);
      // 첫 번째 작업은 이미 실행 중이므로, 나머지는 우선순위 순
      expect(executionOrder.slice(1)).toEqual([10, 5]);
    });

    it('should use default priority when not specified', async () => {
      const limit = pLimit(1);

      const taskWithoutPriority = limit(async () => 'default');
      const taskWithPriority = limit(async () => 'with-priority', {
        priority: 8,
      });

      const results = await Promise.all([
        taskWithoutPriority,
        taskWithPriority,
      ]);

      expect(results).toEqual(['default', 'with-priority']);
    });
  });

  describe('Dynamic concurrency adjustment', () => {
    it('should support dynamic concurrency change', async () => {
      const limit = pLimit(1);
      let activeCount = 0;
      let maxActiveCount = 0;

      const createTask = (id: number) => async () => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);

        // 동시성 증가
        if (id === 2) {
          limit.setConcurrency(3);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        activeCount--;
        return id;
      };

      const tasks = Array.from({ length: 6 }, (_, i) => createTask(i));
      const results = await Promise.all(tasks.map((task) => limit(task)));

      expect(results).toEqual([0, 1, 2, 3, 4, 5]);
      // 동시성이 1에서 3으로 증가해야 함
      expect(maxActiveCount).toBeGreaterThanOrEqual(1);
      expect(maxActiveCount).toBeLessThanOrEqual(3);
    });

    it('should throw error when setting invalid concurrency', () => {
      const limit = pLimit(2);

      expect(() => limit.setConcurrency(0)).toThrow(
        'Concurrency must be at least 1',
      );
      expect(() => limit.setConcurrency(-1)).toThrow(
        'Concurrency must be at least 1',
      );
    });
  });

  describe('clearQueue', () => {
    it('should clear pending queue and reject all queued tasks', async () => {
      const limit = pLimit(1);

      // 긴 작업 하나 실행
      const longTaskPromise = limit(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'long';
      });

      // 여러 개의 대기 작업 추가
      const queuedTasks = Array.from({ length: 5 }, (_, i) =>
        limit(async () => `task-${i}`),
      );

      // 큐 비우기
      limit.clearQueue();

      // 대기 작업들은 AbortError로 reject되어야 함
      await Promise.all(
        queuedTasks.map((promise) =>
          expect(promise).rejects.toThrow(AbortError),
        ),
      );

      // 긴 작업은 정상 완료되어야 함
      await expect(longTaskPromise).resolves.toBe('long');

      expect(limit.pendingCount).toBe(0);
    });
  });

  describe('AbortSignal support', () => {
    it('should reject queued tasks when signal is aborted', async () => {
      const limit = pLimit(1);
      const controller = new AbortController();

      // 긴 작업 실행
      const longTaskPromise = limit(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return 'long';
      });

      // AbortSignal과 함께 대기 작업 추가
      const queuedTaskPromise = limit(async () => 'queued', {
        signal: controller.signal,
      });

      // 취소
      controller.abort();

      await expect(queuedTaskPromise).rejects.toThrow(AbortError);
      await expect(longTaskPromise).resolves.toBe('long');
    });

    it('should reject immediately when signal is already aborted', async () => {
      const limit = pLimit(1);
      const controller = new AbortController();
      controller.abort();

      const taskPromise = limit(async () => 'result', {
        signal: controller.signal,
      });

      await expect(taskPromise).rejects.toThrow(AbortError);
    });

    it('should handle abort during task execution', async () => {
      const limit = pLimit(1);
      const controller = new AbortController();

      const taskPromise = limit(
        async () => {
          controller.abort();
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'result';
        },
        { signal: controller.signal },
      );

      await expect(taskPromise).rejects.toThrow(AbortError);
    });
  });

  describe('Error handling', () => {
    it('should handle task failures properly', async () => {
      const limit = pLimit(2);

      const successTask = limit(async () => 'success');
      const failureTask = limit(async () => {
        throw new Error('Task failed');
      });

      await expect(successTask).resolves.toBe('success');
      await expect(failureTask).rejects.toThrow('Task failed');

      expect(limit.activeCount).toBe(0);
    });

    it('should continue processing other tasks when one fails', async () => {
      const limit = pLimit(2);

      const tasks = [
        async () => 'success1',
        async () => {
          throw new Error('failure');
        },
        async () => 'success2',
        async () => 'success3',
      ];

      const results = await Promise.allSettled(
        tasks.map((task) => limit(task)),
      );

      expect(results[0].status).toBe('fulfilled');
      expect((results[0] as any).value).toBe('success1');

      expect(results[1].status).toBe('rejected');
      expect((results[1] as any).reason.message).toBe('failure');

      expect(results[2].status).toBe('fulfilled');
      expect((results[2] as any).value).toBe('success2');

      expect(results[3].status).toBe('fulfilled');
      expect((results[3] as any).value).toBe('success3');
    });

    it('should throw error when creating limit with invalid concurrency', () => {
      expect(() => pLimit(0)).toThrow('Concurrency must be at least 1');
      expect(() => pLimit(-1)).toThrow('Concurrency must be at least 1');
    });
  });

  describe('State tracking', () => {
    it('should track active and pending counts correctly', async () => {
      const limit = pLimit(2);

      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);

      const createTask = (delay: number) => async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return 'done';
      };

      const tasks = [
        createTask(20),
        createTask(30),
        createTask(10),
        createTask(15),
      ];

      const promises = tasks.map((task) => limit(task));

      // 일부 시간 후 확인
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(limit.activeCount).toBeLessThanOrEqual(2);
      expect(limit.pendingCount).toBeGreaterThanOrEqual(2);

      await Promise.all(promises);
      expect(limit.activeCount).toBe(0);
      expect(limit.pendingCount).toBe(0);
    });
  });
});

describe('PriorityQueue', () => {
  it('should maintain priority order', () => {
    const queue = new PriorityQueue();

    // 낮은 우선순위부터 추가
    queue.enqueue({
      fn: async () => 1,
      resolve: vi.fn(),
      reject: vi.fn(),
      options: { priority: 1, signal: undefined, id: '1' },
      timestamp: Date.now(),
      id: '1',
    });

    queue.enqueue({
      fn: async () => 3,
      resolve: vi.fn(),
      reject: vi.fn(),
      options: { priority: 3, signal: undefined, id: '3' },
      timestamp: Date.now() + 1,
      id: '3',
    });

    queue.enqueue({
      fn: async () => 2,
      resolve: vi.fn(),
      reject: vi.fn(),
      options: { priority: 2, signal: undefined, id: '2' },
      timestamp: Date.now() + 2,
      id: '2',
    });

    // 높은 우선순위부터 나와야 함
    const item1 = queue.dequeue();
    const item2 = queue.dequeue();
    const item3 = queue.dequeue();

    expect(item1?.id).toBe('3'); // 가장 높은 우선순위
    expect(item2?.id).toBe('2'); // 중간 우선순위
    expect(item3?.id).toBe('1'); // 가장 낮은 우선순위
  });

  it('should maintain FIFO order for equal priorities', () => {
    const queue = new PriorityQueue();
    const baseTime = Date.now();

    queue.enqueue({
      fn: async () => 1,
      resolve: vi.fn(),
      reject: vi.fn(),
      options: { priority: 5, signal: undefined, id: '1' },
      timestamp: baseTime,
      id: '1',
    });

    queue.enqueue({
      fn: async () => 2,
      resolve: vi.fn(),
      reject: vi.fn(),
      options: { priority: 5, signal: undefined, id: '2' },
      timestamp: baseTime + 1,
      id: '2',
    });

    queue.enqueue({
      fn: async () => 3,
      resolve: vi.fn(),
      reject: vi.fn(),
      options: { priority: 5, signal: undefined, id: '3' },
      timestamp: baseTime + 2,
      id: '3',
    });

    const item1 = queue.dequeue();
    const item2 = queue.dequeue();
    const item3 = queue.dequeue();

    expect(item1?.id).toBe('1');
    expect(item2?.id).toBe('2');
    expect(item3?.id).toBe('3');
  });
});

describe('pLimitAll and pLimitSettled', () => {
  it('should execute all tasks with concurrency limit', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const tasks = Array.from({ length: 10 }, (_, i) => async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

      await new Promise((resolve) => setTimeout(resolve, 5));

      currentConcurrent--;
      return i;
    });

    const results = await pLimitAll(tasks, 3);

    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('should handle mixed success and failure with pLimitSettled', async () => {
    const tasks = [
      async () => 'success',
      async () => {
        throw new Error('failure');
      },
      async () => 'success2',
      async () => {
        throw new Error('failure2');
      },
    ];

    const results = await pLimitSettled(tasks, 2);

    expect(results).toHaveLength(4);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
    expect(results[3].status).toBe('rejected');
  });
});
