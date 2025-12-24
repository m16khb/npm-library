import {describe, it, expect, beforeEach, vi} from 'vitest';
import {QueueRegistryService} from '../../../src/services/queue-registry.service.js';
import {SidequestAdapter} from '../../../src/core/sidequest.adapter.js';
import type {SidequestModuleOptions} from '../../../src/interfaces/module-options.interface.js';

// Mock SidequestAdapter
vi.mock('../../../src/core/sidequest.adapter.js', () => ({
  SidequestAdapter: vi.fn().mockImplementation(() => ({
    addJob: vi.fn().mockResolvedValue('job-123'),
    addBulkJobs: vi.fn().mockResolvedValue(['job-1', 'job-2']),
  })),
}));

describe('QueueRegistryService', () => {
  let service: QueueRegistryService;
  let mockAdapter: SidequestAdapter;
  const mockOptions: SidequestModuleOptions = {
    backend: {
      driver: '@sidequest/sqlite-backend',
      config: ':memory:',
    },
    queues: [
      {name: 'email', concurrency: 5},
      {name: 'notification', concurrency: 10},
    ],
  };

  beforeEach(() => {
    mockAdapter = new SidequestAdapter();
    service = new QueueRegistryService(mockOptions, mockAdapter);
  });

  describe('initializeQueues', () => {
    it('설정된 큐들이 초기화된다', () => {
      expect(service.getQueue('email')).toBeDefined();
      expect(service.getQueue('notification')).toBeDefined();
    });

    it('기본 큐(default)가 자동 생성된다', () => {
      expect(service.getQueue('default')).toBeDefined();
    });
  });

  describe('getQueue', () => {
    it('등록된 큐를 반환한다', () => {
      const queue = service.getQueue('email');
      expect(queue).toBeDefined();
      expect(queue?.name).toBe('email');
    });

    it('등록되지 않은 큐에 대해 undefined를 반환한다', () => {
      const queue = service.getQueue('nonexistent');
      expect(queue).toBeUndefined();
    });
  });

  describe('getQueueOrThrow', () => {
    it('등록된 큐를 반환한다', () => {
      const queue = service.getQueueOrThrow('email');
      expect(queue).toBeDefined();
      expect(queue.name).toBe('email');
    });

    it('등록되지 않은 큐에 대해 에러를 throw한다', () => {
      expect(() => service.getQueueOrThrow('nonexistent')).toThrow(
        "Queue 'nonexistent' not found",
      );
    });
  });

  describe('getAllQueues', () => {
    it('모든 등록된 큐를 반환한다', () => {
      const queues = service.getAllQueues();
      expect(queues.size).toBeGreaterThanOrEqual(3); // email, notification, default
      expect(queues.has('email')).toBe(true);
      expect(queues.has('notification')).toBe(true);
      expect(queues.has('default')).toBe(true);
    });
  });

  describe('IQueueService', () => {
    it('add 메서드가 Job을 추가한다', async () => {
      const queue = service.getQueueOrThrow('email');

      class SendEmailJob {
        async run() {}
      }

      const jobId = await queue.add(SendEmailJob, 'user@example.com');
      expect(jobId).toBeDefined();
      expect(mockAdapter.addJob).toHaveBeenCalledWith('email', 'SendEmailJob', ['user@example.com']);
    });

    it('addWithOptions 메서드가 옵션과 함께 Job을 추가한다', async () => {
      const queue = service.getQueueOrThrow('email');

      class SendEmailJob {
        async run() {}
      }

      const jobId = await queue.addWithOptions(
        SendEmailJob,
        {timeout: 5000, maxAttempts: 3},
        'user@example.com',
      );
      expect(jobId).toBeDefined();
      expect(mockAdapter.addJob).toHaveBeenCalledWith(
        'email',
        'SendEmailJob',
        ['user@example.com'],
        {timeout: 5000, maxAttempts: 3},
      );
    });

    it('addScheduled 메서드가 예약된 Job을 추가한다', async () => {
      const queue = service.getQueueOrThrow('email');
      const scheduledAt = new Date('2025-01-01');

      class SendEmailJob {
        async run() {}
      }

      const jobId = await queue.addScheduled(SendEmailJob, scheduledAt, 'user@example.com');
      expect(jobId).toBeDefined();
      expect(mockAdapter.addJob).toHaveBeenCalledWith(
        'email',
        'SendEmailJob',
        ['user@example.com'],
        {scheduledAt},
      );
    });

    it('addBulk 메서드가 여러 Job을 추가한다', async () => {
      const queue = service.getQueueOrThrow('email');

      class SendEmailJob {
        async run() {}
      }

      const jobIds = await queue.addBulk([
        {JobClass: SendEmailJob, args: ['user1@example.com']},
        {JobClass: SendEmailJob, args: ['user2@example.com']},
      ]);

      expect(jobIds).toBeDefined();
      expect(mockAdapter.addBulkJobs).toHaveBeenCalled();
    });

    it('addBulk 메서드가 사용자 지정 chunkSize를 전달한다', async () => {
      const queue = service.getQueueOrThrow('email');

      class SendEmailJob {
        async run() {}
      }

      await queue.addBulk(
        [
          {JobClass: SendEmailJob, args: ['user1@example.com']},
          {JobClass: SendEmailJob, args: ['user2@example.com']},
        ],
        {chunkSize: 50},
      );

      expect(mockAdapter.addBulkJobs).toHaveBeenCalledWith(
        'email',
        expect.any(Array),
        50,
      );
    });

    it('addBulk 메서드가 빈 배열 입력 시 빈 배열을 반환한다', async () => {
      const queue = service.getQueueOrThrow('email');

      const jobIds = await queue.addBulk([]);

      expect(jobIds).toEqual([]);
      expect(mockAdapter.addBulkJobs).not.toHaveBeenCalled();
    });

    it('addBulk 메서드가 chunkSize <= 0이면 에러를 throw한다', async () => {
      const queue = service.getQueueOrThrow('email');

      class SendEmailJob {
        async run() {}
      }

      await expect(
        queue.addBulk([{JobClass: SendEmailJob, args: ['test']}], {chunkSize: 0}),
      ).rejects.toThrow('BulkJobOptions.chunkSize must be a positive number');

      await expect(
        queue.addBulk([{JobClass: SendEmailJob, args: ['test']}], {chunkSize: -10}),
      ).rejects.toThrow('BulkJobOptions.chunkSize must be a positive number');
    });

    it('addBulk 메서드가 Job 옵션을 전달한다', async () => {
      const queue = service.getQueueOrThrow('email');

      class SendEmailJob {
        async run() {}
      }

      await queue.addBulk([
        {JobClass: SendEmailJob, args: ['user@example.com'], options: {timeout: 5000}},
      ]);

      expect(mockAdapter.addBulkJobs).toHaveBeenCalledWith(
        'email',
        [{jobName: 'SendEmailJob', args: ['user@example.com'], options: {timeout: 5000}}],
        100, // DEFAULT_CHUNK_SIZE
      );
    });
  });
});
