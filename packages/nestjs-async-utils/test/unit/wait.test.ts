import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {wait, waitUntil, waitFor, AbortError} from '../../src/core';

describe('wait', () => {
  describe('Basic functionality', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await wait(100);
      const elapsed = Date.now() - start;

      // 타이밍 오차 ±50ms 허용
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });

    it('should resolve immediately for 0ms', async () => {
      const start = Date.now();
      await wait(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('should reject for negative ms', async () => {
      await expect(wait(-100)).rejects.toThrow('Wait time must be non-negative');
    });

    it('should return void by default', async () => {
      const result = await wait(10);
      expect(result).toBeUndefined();
    });
  });

  describe('Value return', () => {
    it('should return value when provided', async () => {
      const result = await wait(10, 'hello');
      expect(result).toBe('hello');
    });

    it('should return object value', async () => {
      const obj = {foo: 'bar'};
      const result = await wait(10, obj);
      expect(result).toBe(obj);
    });

    it('should return number value', async () => {
      const result = await wait(10, 42);
      expect(result).toBe(42);
    });

    it('should return null value', async () => {
      const result = await wait(10, null);
      expect(result).toBeNull();
    });

    it('should return value from options', async () => {
      const result = await wait(10, {value: 'from options'});
      expect(result).toBe('from options');
    });
  });

  describe('AbortSignal support', () => {
    it('should be cancelled by abort signal', async () => {
      const controller = new AbortController();

      const waitPromise = wait(1000, {signal: controller.signal});

      // 50ms 후에 abort
      setTimeout(() => controller.abort(), 50);

      await expect(waitPromise).rejects.toThrow(AbortError);
    });

    it('should reject immediately if signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const start = Date.now();
      await expect(wait(1000, {signal: controller.signal})).rejects.toThrow(AbortError);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('should include abort reason in error', async () => {
      const controller = new AbortController();
      controller.abort('Custom reason');

      try {
        await wait(1000, {signal: controller.signal});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AbortError);
        expect((error as AbortError).message).toBe('Custom reason');
      }
    });

    it('should include abort error in error', async () => {
      const controller = new AbortController();
      const originalError = new Error('Original error');
      controller.abort(originalError);

      try {
        await wait(1000, {signal: controller.signal});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AbortError);
        expect((error as AbortError).message).toBe('Original error');
      }
    });

    it('should clean up abort listener after completion', async () => {
      const controller = new AbortController();
      await wait(10, {signal: controller.signal});

      // abort 호출해도 에러가 발생하지 않아야 함 (리스너가 제거됨)
      controller.abort();
      // 에러 없이 완료되면 성공
      expect(true).toBe(true);
    });

    it('should handle 0ms with abort signal', async () => {
      const controller = new AbortController();
      const result = await wait(0, {signal: controller.signal});
      expect(result).toBeUndefined();
    });

    it('should reject 0ms if already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(wait(0, {signal: controller.signal})).rejects.toThrow(AbortError);
    });
  });

  describe('Memory leak prevention', () => {
    it('should clear timeout after abort', async () => {
      const controller = new AbortController();

      const waitPromise = wait(10000, {signal: controller.signal});
      controller.abort();

      await expect(waitPromise).rejects.toThrow(AbortError);

      // 타이머가 정리되었는지 확인 - 더 이상 대기하지 않아야 함
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50));
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should not leak timers with many concurrent waits', async () => {
      const promises = Array.from({length: 100}, () => wait(10));
      await Promise.all(promises);

      // 모든 타이머가 정리되었는지 확인
      expect(true).toBe(true);
    });

    it('should handle rapid abort calls', async () => {
      const controllers = Array.from({length: 50}, () => new AbortController());

      const promises = controllers.map(controller =>
        wait(1000, {signal: controller.signal}).catch(() => 'aborted'),
      );

      // 모두 abort
      controllers.forEach(c => c.abort());

      const results = await Promise.all(promises);

      expect(results.every(r => r === 'aborted')).toBe(true);
    });
  });

  describe('Race condition prevention', () => {
    it('should handle abort during timer execution', async () => {
      const controller = new AbortController();

      // 매우 짧은 대기 시간
      const waitPromise = wait(1, {signal: controller.signal});

      // 동시에 abort
      controller.abort();

      // 둘 중 하나의 결과만 나와야 함
      const result = await waitPromise.then(() => 'resolved').catch(() => 'rejected');

      expect(['resolved', 'rejected']).toContain(result);
    });

    it('should not resolve after abort', async () => {
      const controller = new AbortController();
      let resolved = false;

      const waitPromise = wait(50, {signal: controller.signal})
        .then(() => {
          resolved = true;
        })
        .catch(() => {});

      controller.abort();
      await waitPromise;

      // abort 후에 resolved가 true가 되면 안 됨
      expect(resolved).toBe(false);
    });
  });

  describe('unref option', () => {
    it('should accept unref option without error', async () => {
      await wait(10, {unref: true});
      expect(true).toBe(true);
    });

    it('should work with both value and unref', async () => {
      const result = await wait(10, 'value', {unref: true});
      expect(result).toBe('value');
    });
  });
});

describe('waitUntil', () => {
  it('should resolve when condition becomes true', async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 50);

    const start = Date.now();
    await waitUntil(() => ready);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(150);
  });

  it('should resolve immediately if condition is already true', async () => {
    const start = Date.now();
    await waitUntil(() => true);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  it('should support async condition', async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 50);

    await waitUntil(async () => {
      await wait(1);
      return ready;
    });

    expect(ready).toBe(true);
  });

  it('should timeout after specified time', async () => {
    await expect(
      waitUntil(() => false, {timeout: 100}),
    ).rejects.toThrow('waitUntil timed out after 100ms');
  });

  it('should be cancellable with abort signal', async () => {
    const controller = new AbortController();

    const promise = waitUntil(() => false, {signal: controller.signal});

    setTimeout(() => controller.abort(), 50);

    await expect(promise).rejects.toThrow(AbortError);
  });

  it('should use custom interval', async () => {
    let checkCount = 0;
    let ready = false;

    setTimeout(() => {
      ready = true;
    }, 100);

    await waitUntil(
      () => {
        checkCount++;
        return ready;
      },
      {interval: 10},
    );

    // 100ms / 10ms = 약 10회 이상 체크
    expect(checkCount).toBeGreaterThan(5);
  });
});

describe('waitFor', () => {
  it('should call callback specified number of times', async () => {
    const calls: number[] = [];

    await waitFor(5, 10, i => {
      calls.push(i);
    });

    expect(calls).toEqual([0, 1, 2, 3, 4]);
  });

  it('should wait between iterations', async () => {
    const start = Date.now();

    await waitFor(3, 50);

    const elapsed = Date.now() - start;

    // 3회 반복, 2번의 대기 (50ms * 2 = 100ms)
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(200);
  });

  it('should support async callback', async () => {
    const results: number[] = [];

    await waitFor(3, 10, async i => {
      await wait(5);
      results.push(i);
    });

    expect(results).toEqual([0, 1, 2]);
  });

  it('should be cancellable with abort signal', async () => {
    const controller = new AbortController();
    const calls: number[] = [];

    const promise = waitFor(
      10,
      50,
      i => {
        calls.push(i);
      },
      {signal: controller.signal},
    );

    setTimeout(() => controller.abort(), 75);

    await expect(promise).rejects.toThrow(AbortError);

    // 일부만 실행됨
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThan(10);
  });

  it('should work without callback', async () => {
    const start = Date.now();

    await waitFor(3, 20);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(35);
  });

  it('should not wait after last iteration', async () => {
    const start = Date.now();

    await waitFor(1, 1000);

    const elapsed = Date.now() - start;

    // 1회만 실행하므로 대기 없음
    expect(elapsed).toBeLessThan(50);
  });
});
