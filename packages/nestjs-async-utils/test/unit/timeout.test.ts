import { describe, it, expect, vi } from 'vitest';
import { pTimeout, pTimeoutAll, pTimeoutSettled } from '../../src/core';
import { TimeoutError, AbortError } from '../../src/core';

describe('pTimeout', () => {

  describe('Basic timeout functionality', () => {
    it('should resolve promise when it completes before timeout', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 10);
      });

      const result = await pTimeout(promise, 50);

      expect(result).toBe('success');
    });

    it('should throw TimeoutError when promise exceeds timeout', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 50);
      });

      const timeoutPromise = pTimeout(promise, 25);

      // 실제 타이머 사용 - advanceTimersByTime 제거

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
      await expect(timeoutPromise).rejects.toThrow(
        'Operation timed out after 25ms',
      );
    });

    it('should return fallback value when timeout occurs and fallback is provided', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 50);
      });

      const timeoutPromise = pTimeout(promise, 25, 'fallback');

      // 실제 타이머 사용 - advanceTimersByTime 제거

      const result = await timeoutPromise;
      expect(result).toBe('fallback');
    });
  });

  describe('Options object usage', () => {
    it('should accept options object', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 10);
      });

      const result = await pTimeout(promise, {
        milliseconds: 25,
      });

      // 실제 타이머 사용 - advanceTimersByTime 제거
      expect(result).toBe('success');
    });

    it('should handle fallback in options object', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 50);
      });

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 25,
        fallback: 'fallback',
      });

      // 실제 타이머 사용 - advanceTimersByTime 제거

      const result = await timeoutPromise;
      expect(result).toBe('fallback');
    });
  });

  describe('AbortSignal support', () => {
    it('should reject with AbortError when signal is aborted', async () => {
      const controller = new AbortController();
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 50);
      });

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 25,
        signal: controller.signal,
      });

      controller.abort();

      await expect(timeoutPromise).rejects.toThrow(AbortError);
      // 메시지는 Node.js 버전에 따라 다를 수 있음 ("Operation was aborted" 또는 "This operation was aborted")
      await expect(timeoutPromise).rejects.toThrow(/aborted/i);
    });

    it('should reject immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const promise = new Promise((resolve) => resolve('success'));

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 25,
        signal: controller.signal,
      });

      await expect(timeoutPromise).rejects.toThrow(AbortError);
    });
  });

  describe('Callbacks', () => {
    it('should call onTimeout callback when timeout occurs', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 50);
      });

      const onTimeout = vi.fn();

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 25,
        onTimeout,
      });

      // 실제 타이머 사용 - advanceTimersByTime 제거

      try {
        await timeoutPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        // Expected
      }

      expect(onTimeout).toHaveBeenCalledWith('Timeout after 25ms');
    });

    it('should call onSuccess callback when promise completes', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 10);
      });

      const onSuccess = vi.fn();

      const result = await pTimeout(promise, {
        milliseconds: 25,
        onSuccess,
      });

      // 실제 타이머 사용 - advanceTimersByTime 제거

      expect(result).toBe('success');
      expect(onSuccess).toHaveBeenCalledWith('success', expect.any(Number));
      expect(onSuccess).toHaveBeenCalledWith('success', expect.any(Number));
    });

    it('should call onError callback when promise fails', async () => {
      const promise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Promise failed')), 10);
      });

      const onError = vi.fn();

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 25,
        onError,
      });

      // 실제 타이머 사용 - advanceTimersByTime 제거

      await expect(timeoutPromise).rejects.toThrow('Promise failed');
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Number),
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Promise failed' }),
        expect.any(Number),
      );
    });

    it('should call cleanup function on timeout', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 50);
      });

      const cleanup = vi.fn();

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 25,
        cleanup,
      });

      // 실제 타이머 사용 - advanceTimersByTime 제거

      try {
        await timeoutPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        // Expected
      }

      expect(cleanup).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should preserve original promise errors', async () => {
      const originalError = new Error('Original error');
      const promise = Promise.reject(originalError);

      await expect(pTimeout(promise, 25)).rejects.toBe(originalError);
    });

    it('should handle non-Error rejections', async () => {
      const promise = Promise.reject('String error');

      await expect(pTimeout(promise, 25)).rejects.toThrow('String error');
    });

    it('should continue even if cleanup function throws', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 50);
      });

      const cleanup = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const timeoutPromise = pTimeout(promise, {
        milliseconds: 25,
        cleanup,
      });

      // 실제 타이머 사용 - advanceTimersByTime 제거

      try {
        await timeoutPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
      }

      expect(cleanup).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero timeout (immediate timeout)', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 10);
      });

      const timeoutPromise = pTimeout(promise, 0);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
    });

    it('should handle immediate promise resolution', async () => {
      const promise = Promise.resolve('immediate');

      const result = await pTimeout(promise, 25);

      expect(result).toBe('immediate');
    });

    it('should handle immediate promise rejection', async () => {
      const promise = Promise.reject(new Error('immediate error'));

      await expect(pTimeout(promise, 25)).rejects.toThrow('immediate error');
    });
  });
});

describe('pTimeoutAll', () => {

  it('should resolve all promises before timeout', async () => {
    const promises = [
      new Promise((resolve) => setTimeout(() => resolve(1), 10)),
      new Promise((resolve) => setTimeout(() => resolve(2), 15)),
      new Promise((resolve) => setTimeout(() => resolve(3), 20)),
    ];

    const resultPromise = pTimeoutAll(promises, 30);

    // 실제 타이머 사용 - advanceTimersByTime 제거

    const result = await resultPromise;
    expect(result).toEqual([1, 2, 3]);
  });

  it('should reject if any promise times out', async () => {
    const promises = [
      new Promise((resolve) => setTimeout(() => resolve(1), 10)),
      new Promise((resolve) => setTimeout(() => resolve(2), 50)),
      new Promise((resolve) => setTimeout(() => resolve(3), 60)),
    ];

    const resultPromise = pTimeoutAll(promises, 30);

    // 실제 타이머 사용 - advanceTimersByTime 제거

    await expect(resultPromise).rejects.toThrow(TimeoutError);
  });
});

describe('pTimeoutSettled', () => {

  it('should settle all promises before timeout', async () => {
    const promises = [
      new Promise((resolve) => setTimeout(() => resolve(1), 10)),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('failed')), 60),
      ),
      new Promise((resolve) => setTimeout(() => resolve(3), 20)),
    ];

    const resultPromise = pTimeoutSettled(promises, 30);

    // 실제 타이머 사용 - advanceTimersByTime 제거

    const result = await resultPromise;

    expect(result).toHaveLength(3);
    expect(result[0].status).toBe('fulfilled');
    expect((result[0] as any).value).toBe(1);
    expect(result[1].status).toBe('rejected');
    expect((result[1] as any).reason).toBeInstanceOf(TimeoutError);
    expect(result[2].status).toBe('fulfilled');
    expect((result[2] as any).value).toBe(3);
  });

  it('should handle timeouts in settled results', async () => {
    const promises = [
      new Promise((resolve) => setTimeout(() => resolve(1), 10)),
      new Promise((resolve) => setTimeout(() => resolve(2), 40)),
      new Promise((resolve) => setTimeout(() => resolve(3), 25)),
    ];

    const resultPromise = pTimeoutSettled(promises, 30);

    // 실제 타이머 사용 - advanceTimersByTime 제거

    const result = await resultPromise;

    expect(result).toHaveLength(3);
    expect(result[0].status).toBe('fulfilled');
    expect(result[1].status).toBe('rejected');
    expect((result[1] as any).reason).toBeInstanceOf(TimeoutError);
    expect(result[2].status).toBe('fulfilled');
  });
});
