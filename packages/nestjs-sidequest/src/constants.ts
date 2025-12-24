/**
 * SidequestModule 상수
 */

// DI 토큰
export const SIDEQUEST_MODULE_OPTIONS = Symbol('SIDEQUEST_MODULE_OPTIONS');
export const SIDEQUEST_ENGINE = Symbol('SIDEQUEST_ENGINE');

// 메타데이터 키
export const PROCESSOR_METADATA_KEY = Symbol('sidequest:processor');
export const ON_JOB_METADATA_KEY = Symbol('sidequest:on-job');
export const RETRY_OPTIONS_METADATA_KEY = Symbol('sidequest:retry');
export const ON_JOB_COMPLETE_METADATA_KEY = Symbol('sidequest:on-job-complete');
export const ON_JOB_FAILED_METADATA_KEY = Symbol('sidequest:on-job-failed');

// Queue 토큰 프리픽스
export const QUEUE_TOKEN_PREFIX = 'SIDEQUEST_QUEUE_';

/**
 * Queue DI 토큰 생성
 */
export function getQueueToken(queueName: string): string {
  return `${QUEUE_TOKEN_PREFIX}${queueName}`;
}

// 기본값
export const DEFAULT_QUEUE_NAME = 'default';
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_CONCURRENCY = 10;
export const DEFAULT_CHUNK_SIZE = 100;

// Log messages
export const LOG_MESSAGES = {
  ENGINE_STARTING: 'Starting Sidequest engine...',
  ENGINE_STARTED: 'Sidequest engine started',
  ENGINE_STOPPING: 'Stopping Sidequest engine...',
  ENGINE_STOPPED: 'Sidequest engine stopped',
  QUEUE_REGISTERED: (name: string) => `Queue '${name}' registered`,
  PROCESSOR_REGISTERED: (name: string) => `Processor '${name}' registered`,
  JOB_HANDLER_REGISTERED: (jobName: string, queueName: string) =>
    `Job handler '${jobName}' (Queue: ${queueName}) registered`,
} as const;
