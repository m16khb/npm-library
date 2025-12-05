import { describe, it, expect, vi } from 'vitest';
import {
  retry,
  exponentialBackoff,
  linearBackoff,
  defaultRetryFilter,
} from '../../src/core/index.js';
import { RetryError, AbortError } from '../../src/core/index.js';

describe('retry - simple tests', () => {
  describe('Basic functionality', () => {
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

      const result = await retry(mockFn, {
        attempts: 3,
        strategy: linearBackoff(10), // 짧은 지연 시간
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const error = new Error('Always fails');
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(
        retry(mockFn, {
          attempts: 2,
          strategy: linearBackoff(10),
        }),
      ).rejects.toThrow(RetryError);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryIf filter', () => {
    it('should not retry AbortError', async () => {
      const abortError = new AbortError('Operation aborted');
      const mockFn = vi.fn().mockRejectedValue(abortError);

      await expect(retry(mockFn, { attempts: 3 })).rejects.toThrow(AbortError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

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

      await expect(
        retry(mockFn, {
          attempts: 3,
          retryIf,
          strategy: linearBackoff(10),
        }),
      ).rejects.toThrow('Non-retryable');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(retryIf).toHaveBeenCalledTimes(2);
    });
  });

  describe('Strategies', () => {
    it('should test exponential backoff strategy', () => {
      const strategy = exponentialBackoff(100, 1000, 2);

      expect(strategy(1)).toBe(100); // 100 * 2^0 = 100
      expect(strategy(2)).toBe(200); // 100 * 2^1 = 200
      expect(strategy(3)).toBe(400); // 100 * 2^2 = 400
      expect(strategy(4)).toBe(800); // 100 * 2^3 = 800
      expect(strategy(5)).toBe(1000); // 100 * 2^4 = 1600, capped at 1000
    });

    it('should test linear backoff strategy', () => {
      const strategy = linearBackoff(500);

      expect(strategy(1)).toBe(500);
      expect(strategy(2)).toBe(500);
      expect(strategy(10)).toBe(500);
    });
  });

  describe('defaultRetryFilter', () => {
    it('should not retry AbortError', () => {
      const abortError = new AbortError();
      expect(defaultRetryFilter(abortError)).toBe(false);
    });

    it('should not retry RetryError', () => {
      const retryError = new RetryError();
      expect(defaultRetryFilter(retryError)).toBe(false);
    });

    it('should retry network errors', () => {
      const connResetError = new Error('Connection reset') as any;
      connResetError.code = 'ECONNRESET';
      expect(defaultRetryFilter(connResetError)).toBe(true);

      const timeoutError = new Error('Connection timeout') as any;
      timeoutError.code = 'ETIMEDOUT';
      expect(defaultRetryFilter(timeoutError)).toBe(true);
    });

    it('should retry HTTP 5xx errors', () => {
      const error500 = new Error('Server Error') as any;
      error500.status = 500;
      expect(defaultRetryFilter(error500)).toBe(true);

      const error503 = new Error('Service Unavailable') as any;
      error503.status = 503;
      expect(defaultRetryFilter(error503)).toBe(true);
    });

    it('should not retry HTTP 4xx errors (except 429)', () => {
      const error404 = new Error('Not Found') as any;
      error404.status = 404;
      expect(defaultRetryFilter(error404)).toBe(false);

      const error400 = new Error('Bad Request') as any;
      error400.status = 400;
      expect(defaultRetryFilter(error400)).toBe(false);
    });

    it('should retry HTTP 429 (Too Many Requests)', () => {
      const error429 = new Error('Too Many Requests') as any;
      error429.status = 429;
      expect(defaultRetryFilter(error429)).toBe(true);
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const onSuccess = vi.fn();

      const result = await retry(mockFn, { onSuccess });

      expect(result).toBe('success');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(1, 'success');
    });

    it('should call onRetry callback', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      await retry(mockFn, {
        attempts: 2,
        strategy: linearBackoff(10),
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 10);
    });

    it('should call onError callback on final failure', async () => {
      const error = new Error('Always fails');
      const mockFn = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      try {
        await retry(mockFn, {
          attempts: 2,
          strategy: linearBackoff(10),
          onError,
        });
        expect.fail('Should have thrown');
      } catch (err) {
        // Expected
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(2, error, [error]);
    });
  });
});
