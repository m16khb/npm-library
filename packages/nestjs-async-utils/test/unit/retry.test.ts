import { describe, it, expect, vi } from 'vitest';
import {
  retry,
  retryWithState,
  defaultRetryFilter,
  exponentialBackoff,
  linearBackoff,
  fixedDelay,
  exponentialBackoffWithJitter,
  incrementalBackoff,
  defaultRetryStrategy,
} from '../../src/core';
import { RetryError, AbortError } from '../../src/core';

describe('retry', () => {

  describe('Basic retry functionality', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await retry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValue('success');

      const result = await retry(mockFn, { attempts: 3 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const error = new Error('Always fails');
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(retry(mockFn, { attempts: 2 })).rejects.toThrow(RetryError);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should throw RetryError with correct information', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(new Error('Error 3'));

      try {
        await retry(mockFn, { attempts: 3 });
        expect.fail('Should have thrown RetryError');
      } catch (err) {
        const retryError = err as RetryError;
        expect(retryError).toBeInstanceOf(RetryError);
        expect(retryError.attempts).toBe(3);
        expect(retryError.lastError?.message).toBe('Error 3');
        expect(retryError.errors).toHaveLength(3);
        expect(retryError.errors[0]).toBe(error1);
        expect(retryError.errors[1]).toBe(error2);
      }
    });
  });

  describe('Retry strategies', () => {
    it('should use exponential backoff strategy', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValue('success');

      const strategy = exponentialBackoff(100, 1000, 2);
      const onRetry = vi.fn();

      // Promise를 먼저 완료시킨 후 onRetry 호출 횟수 확인
      const result = await retry(mockFn, {
        attempts: 3,
        strategy,
        onRetry,
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);

      // 재시도가 2번 발생해야 함 (첫 시도 + 2번 재시도)
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 100);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 200);
    });

    it('should use linear backoff strategy', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValue('success');

      const strategy = linearBackoff(50); // 테스트 속도를 위해 짧은 지연 사용
      const onRetry = vi.fn();

      // Promise를 먼저 완료시킨 후 onRetry 호출 횟수 확인
      const result = await retry(mockFn, {
        attempts: 3,
        strategy,
        onRetry,
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);

      // 재시도가 2번 발생해야 함
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 50);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 50);
    });

    it('should respect max delay in exponential backoff', () => {
      const strategy = exponentialBackoff(100, 500, 2);

      expect(strategy(1)).toBe(100); // 100 * 2^0 = 100
      expect(strategy(2)).toBe(200); // 100 * 2^1 = 200
      expect(strategy(3)).toBe(400); // 100 * 2^2 = 400
      expect(strategy(4)).toBe(500); // 100 * 2^3 = 800, capped at 500
      expect(strategy(5)).toBe(500); // 100 * 2^4 = 1600, capped at 500
    });

    it('should add jitter to exponential backoff', () => {
      const strategy = exponentialBackoffWithJitter(100, 1000, 2, 0.1);

      // 여러 번 실행하여 지터가 적용되는지 확인
      const delays = Array.from({ length: 10 }, () => strategy(2));

      // 지터 범위: 200 ± 20 (180-220)
      expect(delays.every((delay) => delay >= 180 && delay <= 220)).toBe(true);
    });

    it('should use incremental backoff strategy', () => {
      const strategy = incrementalBackoff(100, 50, 500);

      expect(strategy(1)).toBe(100); // 100 + 0 * 50 = 100
      expect(strategy(2)).toBe(150); // 100 + 1 * 50 = 150
      expect(strategy(3)).toBe(200); // 100 + 2 * 50 = 200
      expect(strategy(8)).toBe(450); // 100 + 7 * 50 = 450
      expect(strategy(9)).toBe(500); // 100 + 8 * 50 = 500, capped at 500
    });
  });

  describe('retryIf filter', () => {
    it('should respect custom retryIf filter', async () => {
      const retryableError = new Error('Retryable');
      const nonRetryableError = new Error('Non-retryable');

      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(nonRetryableError)
        .mockResolvedValue('success');

      const retryIf = vi.fn((error: Error) =>
        error.message.includes('Retryable'),
      );

      await expect(retry(mockFn, { attempts: 3, retryIf })).rejects.toThrow(
        'Non-retryable',
      );
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(retryIf).toHaveBeenCalledTimes(2);
    });

    it('should not retry AbortError by default', async () => {
      const abortError = new AbortError('Operation aborted');
      const mockFn = vi.fn().mockRejectedValue(abortError);

      await expect(retry(mockFn, { attempts: 3 })).rejects.toThrow(AbortError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry RetryError by default', async () => {
      const retryError = new RetryError('Already retried');
      const mockFn = vi.fn().mockRejectedValue(retryError);

      await expect(retry(mockFn, { attempts: 3 })).rejects.toThrow(RetryError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry network errors by default', () => {
      expect(defaultRetryFilter(new Error('ECONNRESET'))).toBe(true);
      expect(defaultRetryFilter(new Error('ETIMEDOUT'))).toBe(true);
      expect(defaultRetryFilter(new Error('ENOTFOUND'))).toBe(true);
    });

    it('should retry HTTP error status codes by default', () => {
      const error500 = new Error('Server Error') as any;
      error500.status = 500;
      expect(defaultRetryFilter(error500)).toBe(true);

      const error503 = new Error('Service Unavailable') as any;
      error503.status = 503;
      expect(defaultRetryFilter(error503)).toBe(true);

      const error404 = new Error('Not Found') as any;
      error404.status = 404;
      expect(defaultRetryFilter(error404)).toBe(false);
    });
  });

  describe('AbortSignal support', () => {
    it('should abort when signal is aborted during delay', async () => {
      const controller = new AbortController();
      const mockFn = vi.fn().mockRejectedValue(new Error('Failed'));

      const retryPromise = retry(mockFn, {
        attempts: 2,
        signal: controller.signal,
        strategy: linearBackoff(1000),
      });

      // 첫 번째 시도 실패 후, 재시도 대기 중에 abort
      await new Promise((resolve) => setTimeout(resolve, 0)); // 첫 번째 시도 실행
      controller.abort();

      await expect(retryPromise).rejects.toThrow(AbortError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should abort immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const mockFn = vi.fn();

      await expect(
        retry(mockFn, { signal: controller.signal }),
      ).rejects.toThrow(AbortError);
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('should call onRetry callback', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      await retry(mockFn, { attempts: 2, onRetry });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        1,
        expect.any(Error),
        expect.any(Number),
      );
    });

    it('should call onSuccess callback', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const onSuccess = vi.fn();

      const result = await retry(mockFn, { onSuccess });

      expect(result).toBe('success');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(1, 'success');
    });

    it('should call onError callback on final failure', async () => {
      const error = new Error('Always fails');
      const mockFn = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      try {
        await retry(mockFn, { attempts: 2, onError });
        expect.fail('Should have thrown');
      } catch (err) {
        // Expected
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(2, error, [error]);
    });
  });

  describe('retryWithState', () => {
    it('should return result and state on success', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockResolvedValue('success');

      const { result, state } = await retryWithState(mockFn, { attempts: 3 });

      expect(result).toBe('success');
      expect(state.attempt).toBe(2);
      expect(state.remaining).toBe(1);
      expect(state.delay).toBe(0);
      expect(state.errors).toHaveLength(1);
    });

    it('should throw with state information on failure', async () => {
      const error = new Error('Always fails');
      const mockFn = vi.fn().mockRejectedValue(error);

      try {
        await retryWithState(mockFn, { attempts: 2 });
        expect.fail('Should have thrown');
      } catch (err) {
        const wrapped = err as { error: Error; state: any };
        // retryWithState는 RetryError를 감싸서 반환함
        expect(wrapped.error).toBeInstanceOf(RetryError);
        expect(wrapped.state.attempt).toBe(2);
        expect(wrapped.state.remaining).toBe(0);
        expect(wrapped.state.errors).toHaveLength(2);
        // 원본 에러가 errors 배열에 포함되어 있는지 확인
        expect(wrapped.state.errors[0]).toBe(error);
      }
    });
  });
});
