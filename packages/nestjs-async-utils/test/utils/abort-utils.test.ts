import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkAborted,
  createAbortableDelay,
  signalToPromise,
  withAbortSignal,
  withAutoAbortController
} from '../../src/core/utils/abort-utils';
import { AbortError } from '../../src/core/errors/abort-error';
import { setupFakeTimers, cleanupFakeTimers } from '../helpers/timer-helpers';

describe('Abort Utils', () => {
  beforeEach(() => {
    setupFakeTimers();
  });

  afterEach(() => {
    cleanupFakeTimers();
  });

  describe('checkAborted', () => {
    it('should not throw when signal is not provided', () => {
      expect(() => checkAborted()).not.toThrow();
    });

    it('should not throw when signal is not aborted', () => {
      const controller = new AbortController();

      expect(() => checkAborted(controller.signal)).not.toThrow();
    });

    it('should throw AbortError when signal is aborted', () => {
      const controller = new AbortController();
      controller.abort();

      expect(() => checkAborted(controller.signal)).toThrow(AbortError);
    });

    it('should throw AbortError with default message', () => {
      const controller = new AbortController();
      controller.abort();

      expect(() => checkAborted(controller.signal))
        .toThrow('Operation was aborted');
    });
  });

  describe('createAbortableDelay', () => {
    it('should resolve after delay when not aborted', async () => {
      const promise = createAbortableDelay(1000);

      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const promise = createAbortableDelay(1000, controller.signal, 'Delay was aborted');

      await expect(promise).rejects.toThrow(AbortError);
      await expect(promise).rejects.toThrow('Delay was aborted');
    });

    it('should reject when signal is aborted during delay', async () => {
      const controller = new AbortController();
      const promise = createAbortableDelay(1000, controller.signal, 'Delay was aborted');

      vi.advanceTimersByTime(500);
      controller.abort();

      await expect(promise).rejects.toThrow(AbortError);
      await expect(promise).rejects.toThrow('Delay was aborted');
    });

    it('should not timeout when delay completes before abort', async () => {
      const controller = new AbortController();
      const promise = createAbortableDelay(1000, controller.signal);

      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();

      // After delay completes, abort should not affect the promise
      controller.abort();
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('signalToPromise', () => {
    it('should reject immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const promise = signalToPromise(controller.signal, 'Signal is already aborted');

      await expect(promise).rejects.toThrow(AbortError);
      await expect(promise).rejects.toThrow('Signal is already aborted');
    });

    it('should reject when signal is aborted', async () => {
      const controller = new AbortController();
      const promise = signalToPromise(controller.signal, 'Operation was aborted');

      controller.abort();

      await expect(promise).rejects.toThrow(AbortError);
      await expect(promise).rejects.toThrow('Operation was aborted');
    });

    it('should not reject when signal is not aborted', async () => {
      const controller = new AbortController();
      const promise = signalToPromise(controller.signal);

      // Promise should not resolve or reject within reasonable time
      vi.advanceTimersByTime(10000);

      // Check that promise is still pending
      await expect(Promise.race([
        promise,
        Promise.resolve('pending')
      ])).resolves.toBe('pending');
    });
  });

  describe('withAbortSignal', () => {
    it('should return original promise when no signal provided', async () => {
      const originalPromise = Promise.resolve('success');
      const result = withAbortSignal(originalPromise);

      await expect(result).resolves.toBe('success');
    });

    it('should resolve with original promise value when not aborted', async () => {
      const originalPromise = Promise.resolve('success');
      const controller = new AbortController();
      const result = withAbortSignal(originalPromise, controller.signal);

      await expect(result).resolves.toBe('success');
    });

    it('should reject with AbortError when signal is aborted', async () => {
      const originalPromise = new Promise(resolve => setTimeout(() => resolve('success'), 1000));
      const controller = new AbortController();
      const result = withAbortSignal(originalPromise, controller.signal);

      controller.abort();

      await expect(result).rejects.toThrow(AbortError);
    });

    it('should reject with original promise error when promise fails', async () => {
      const error = new Error('Promise failed');
      const originalPromise = Promise.reject(error);
      const controller = new AbortController();
      const result = withAbortSignal(originalPromise, controller.signal);

      await expect(result).rejects.toThrow(error);
    });

    it('should handle race condition correctly', async () => {
      // Original promise resolves faster than abort
      const originalPromise = new Promise(resolve => setTimeout(() => resolve('success'), 500));
      const controller = new AbortController();
      const result = withAbortSignal(originalPromise, controller.signal);

      vi.advanceTimersByTime(500); // Original promise resolves
      await expect(result).resolves.toBe('success');

      controller.abort(); // Abort after resolution
      await expect(result).resolves.toBe('success'); // Still resolves
    });
  });

  describe('withAutoAbortController', () => {
    it('should pass AbortSignal to function and resolve', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await withAutoAbortController(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it('should automatically abort signal after function completes', async () => {
      let capturedSignal: AbortSignal | undefined;
      const mockFn = vi.fn().mockImplementation((signal) => {
        capturedSignal = signal;
        return Promise.resolve('success');
      });

      await withAutoAbortController(mockFn);

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal?.aborted).toBe(true);
    });

    it('should automatically abort signal even when function throws', async () => {
      let capturedSignal: AbortSignal | undefined;
      const error = new Error('Function failed');
      const mockFn = vi.fn().mockImplementation((signal) => {
        capturedSignal = signal;
        return Promise.reject(error);
      });

      await expect(withAutoAbortController(mockFn)).rejects.toThrow(error);
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal?.aborted).toBe(true);
    });

    it('should propagate function return value correctly', async () => {
      const expectedValue = { data: 'test' };
      const mockFn = vi.fn().mockResolvedValue(expectedValue);

      const result = await withAutoAbortController(mockFn);

      expect(result).toBe(expectedValue);
    });
  });
});