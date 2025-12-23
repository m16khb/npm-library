import {describe, it, expect} from 'vitest';
import {
  SIDEQUEST_MODULE_OPTIONS,
  SIDEQUEST_ENGINE,
  PROCESSOR_METADATA_KEY,
  ON_JOB_METADATA_KEY,
  RETRY_OPTIONS_METADATA_KEY,
  ON_JOB_COMPLETE_METADATA_KEY,
  ON_JOB_FAILED_METADATA_KEY,
  QUEUE_TOKEN_PREFIX,
  getQueueToken,
  DEFAULT_QUEUE_NAME,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_TIMEOUT,
  DEFAULT_CONCURRENCY,
  LOG_MESSAGES,
} from '../../src/constants.js';

describe('Constants', () => {
  describe('DI Tokens', () => {
    it('모듈 옵션 토큰이 Symbol이다', () => {
      expect(typeof SIDEQUEST_MODULE_OPTIONS).toBe('symbol');
    });

    it('엔진 토큰이 Symbol이다', () => {
      expect(typeof SIDEQUEST_ENGINE).toBe('symbol');
    });
  });

  describe('Metadata Keys', () => {
    it('모든 메타데이터 키가 Symbol이다', () => {
      expect(typeof PROCESSOR_METADATA_KEY).toBe('symbol');
      expect(typeof ON_JOB_METADATA_KEY).toBe('symbol');
      expect(typeof RETRY_OPTIONS_METADATA_KEY).toBe('symbol');
      expect(typeof ON_JOB_COMPLETE_METADATA_KEY).toBe('symbol');
      expect(typeof ON_JOB_FAILED_METADATA_KEY).toBe('symbol');
    });
  });

  describe('Queue Token', () => {
    it('큐 토큰 프리픽스가 정의되어 있다', () => {
      expect(QUEUE_TOKEN_PREFIX).toBe('SIDEQUEST_QUEUE_');
    });

    it('getQueueToken이 올바른 토큰을 반환한다', () => {
      expect(getQueueToken('test')).toBe('SIDEQUEST_QUEUE_test');
    });
  });

  describe('Defaults', () => {
    it('기본 큐 이름이 정의되어 있다', () => {
      expect(DEFAULT_QUEUE_NAME).toBe('default');
    });

    it('기본 최대 시도 횟수가 정의되어 있다', () => {
      expect(DEFAULT_MAX_ATTEMPTS).toBe(3);
    });

    it('기본 타임아웃이 정의되어 있다', () => {
      expect(DEFAULT_TIMEOUT).toBe(30000);
    });

    it('기본 동시성이 정의되어 있다', () => {
      expect(DEFAULT_CONCURRENCY).toBe(10);
    });
  });

  describe('Log Messages', () => {
    it('엔진 로그 메시지가 정의되어 있다', () => {
      expect(LOG_MESSAGES.ENGINE_STARTING).toBeDefined();
      expect(LOG_MESSAGES.ENGINE_STARTED).toBeDefined();
      expect(LOG_MESSAGES.ENGINE_STOPPING).toBeDefined();
      expect(LOG_MESSAGES.ENGINE_STOPPED).toBeDefined();
    });

    it('큐 등록 메시지 함수가 동작한다', () => {
      expect(LOG_MESSAGES.QUEUE_REGISTERED('test')).toBe("Queue 'test' registered");
    });

    it('프로세서 등록 메시지 함수가 동작한다', () => {
      expect(LOG_MESSAGES.PROCESSOR_REGISTERED('test')).toBe("Processor 'test' registered");
    });

    it('Job 핸들러 등록 메시지 함수가 동작한다', () => {
      expect(LOG_MESSAGES.JOB_HANDLER_REGISTERED('TestJob', 'email')).toBe(
        "Job handler 'TestJob' (Queue: email) registered",
      );
    });
  });
});
