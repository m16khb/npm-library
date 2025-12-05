import { describe, it, expect, beforeEach } from 'vitest';
import { AbortError, RetryError, TimeoutError } from '../../src/core/index';

describe('Error Classes', () => {
  describe('AbortError', () => {
    it('should create AbortError with default message', () => {
      const error = new AbortError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AbortError);
      expect(error.name).toBe('AbortError');
      expect(error.code).toBe('ABORT_ERR');
      expect(error.message).toBe('Operation was aborted');
    });

    it('should create AbortError with custom message', () => {
      const message = 'Custom abort message';
      const error = new AbortError(message);

      expect(error.message).toBe(message);
    });

    it('should create AbortError with cause', () => {
      const cause = new Error('Original error');
      const error = new AbortError('Aborted due to error', cause);

      expect(error.cause).toBe(cause);
    });

    it('should identify AbortError correctly', () => {
      const abortError = new AbortError();
      const regularError = new Error();
      const nullError = null;
      const undefinedError = undefined;

      expect(AbortError.isAbortError(abortError)).toBe(true);
      expect(AbortError.isAbortError(regularError)).toBe(false);
      expect(AbortError.isAbortError(nullError)).toBe(false);
      expect(AbortError.isAbortError(undefinedError)).toBe(false);
    });

    it('should detect AbortError in cause chain', () => {
      const originalAbortError = new AbortError('Original abort');
      const wrappedError = new Error('Wrapped error') as Error & {
        cause: Error;
      };
      wrappedError.cause = originalAbortError;
      const doubleWrappedError = new Error('Double wrapped') as Error & {
        cause: Error;
      };
      doubleWrappedError.cause = wrappedError;

      expect(AbortError.hasAbortError(originalAbortError)).toBe(true);
      expect(AbortError.hasAbortError(wrappedError)).toBe(true);
      expect(AbortError.hasAbortError(doubleWrappedError)).toBe(true);
      expect(AbortError.hasAbortError(new Error())).toBe(false);
    });
  });

  describe('RetryError', () => {
    it('should create RetryError with default values', () => {
      const error = new RetryError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RetryError);
      expect(error.name).toBe('RetryError');
      expect(error.code).toBe('RETRY_EXHAUSTED');
      expect(error.message).toBe('Maximum retry attempts exceeded');
      expect(error.attempts).toBe(0);
      expect(error.lastError).toBeUndefined();
      expect(error.errors).toEqual([]);
    });

    it('should create RetryError with custom values', () => {
      const attempts = 3;
      const lastError = new Error('Last attempt failed');
      const errors = [
        new Error('Attempt 1 failed'),
        new Error('Attempt 2 failed'),
        lastError,
      ];

      const error = new RetryError(
        'Custom retry message',
        attempts,
        lastError,
        errors,
      );

      expect(error.message).toBe('Custom retry message');
      expect(error.attempts).toBe(attempts);
      expect(error.lastError).toBe(lastError);
      expect(error.errors).toEqual(errors);
      expect(error.cause).toBe(lastError);
    });

    it('should identify RetryError correctly', () => {
      const retryError = new RetryError();
      const regularError = new Error();

      expect(RetryError.isRetryError(retryError)).toBe(true);
      expect(RetryError.isRetryError(regularError)).toBe(false);
    });

    it('should provide all errors', () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ];

      const retryError = new RetryError('Failed', 3, errors[2], errors);

      expect(retryError.getAllErrors()).toEqual(errors);
    });

    it('should return last error', () => {
      const lastError = new Error('Last error');
      const retryError = new RetryError('Failed', 3, lastError);

      expect(retryError.getLastError()).toBe(lastError);
    });

    it('should return attempt count', () => {
      const attempts = 5;
      const retryError = new RetryError('Failed', attempts);

      expect(retryError.getAttemptCount()).toBe(attempts);
    });
  });

  describe('TimeoutError', () => {
    it('should create TimeoutError with default values', () => {
      const error = new TimeoutError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.name).toBe('TimeoutError');
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe('Operation timed out');
      expect(error.timeout).toBe(0);
      expect(error.cause).toBeUndefined();
    });

    it('should create TimeoutError with custom values', () => {
      const message = 'Custom timeout message';
      const timeout = 5000;
      const cause = new Error('Original error');

      const error = new TimeoutError(message, timeout, cause);

      expect(error.message).toBe(message);
      expect(error.timeout).toBe(timeout);
      expect(error.cause).toBe(cause);
    });

    it('should identify TimeoutError correctly', () => {
      const timeoutError = new TimeoutError();
      const regularError = new Error();

      expect(TimeoutError.isTimeoutError(timeoutError)).toBe(true);
      expect(TimeoutError.isTimeoutError(regularError)).toBe(false);
    });

    it('should return timeout in milliseconds', () => {
      const timeout = 3000;
      const error = new TimeoutError('Timeout', timeout);

      expect(error.getTimeout()).toBe(timeout);
    });

    it('should return timeout in seconds', () => {
      const timeout = 5000;
      const error = new TimeoutError('Timeout', timeout);

      expect(error.getTimeoutSeconds()).toBe(5);
    });
  });
});
