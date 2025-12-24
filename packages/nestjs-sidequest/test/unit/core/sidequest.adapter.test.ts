import {describe, it, expect, beforeEach, vi, type Mock} from 'vitest';
import {SidequestAdapter} from '../../../src/core/sidequest.adapter.js';
import {DEFAULT_CHUNK_SIZE} from '../../../src/constants.js';

// Mock sidequest 패키지
vi.mock('sidequest', () => ({
  Sidequest: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    build: vi.fn().mockReturnValue({
      queue: vi.fn().mockReturnThis(),
      maxAttempts: vi.fn().mockReturnThis(),
      timeout: vi.fn().mockReturnThis(),
      availableAt: vi.fn().mockReturnThis(),
      retryDelay: vi.fn().mockReturnThis(),
      backoffStrategy: vi.fn().mockReturnThis(),
      unique: vi.fn().mockReturnThis(),
      enqueue: vi.fn().mockResolvedValue({id: 1}),
    }),
    job: {
      get: vi.fn().mockResolvedValue(null),
    },
  },
  Job: class Job {},
  JobBuilder: class JobBuilder {},
}));

describe('SidequestAdapter', () => {
  let adapter: SidequestAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SidequestAdapter();
  });

  describe('addBulkJobs', () => {
    // Mock Job 클래스
    class TestJob {
      async run() {}
    }

    beforeEach(() => {
      // Job 등록
      adapter.registerJob('TestJob', TestJob as any);
    });

    describe('청크 처리', () => {
      it('기본 청크 크기(100)로 분할 처리한다', async () => {
        // 250개 Job 생성 → 3개 청크 (100, 100, 50)
        const jobs = Array.from({length: 250}, (_, i) => ({
          jobName: 'TestJob',
          args: [`arg-${i}`],
        }));

        const addJobSpy = vi.spyOn(adapter, 'addJob');
        const jobIds = await adapter.addBulkJobs('test-queue', jobs);

        expect(jobIds).toHaveLength(250);
        expect(addJobSpy).toHaveBeenCalledTimes(250);
      });

      it('사용자 지정 청크 크기로 분할 처리한다', async () => {
        const jobs = Array.from({length: 25}, (_, i) => ({
          jobName: 'TestJob',
          args: [`arg-${i}`],
        }));

        const addJobSpy = vi.spyOn(adapter, 'addJob');
        const jobIds = await adapter.addBulkJobs('test-queue', jobs, 10);

        expect(jobIds).toHaveLength(25);
        expect(addJobSpy).toHaveBeenCalledTimes(25);
      });

      it('청크 크기가 Job 수보다 크면 단일 청크로 처리한다', async () => {
        const jobs = Array.from({length: 5}, (_, i) => ({
          jobName: 'TestJob',
          args: [`arg-${i}`],
        }));

        const addJobSpy = vi.spyOn(adapter, 'addJob');
        const jobIds = await adapter.addBulkJobs('test-queue', jobs, 100);

        expect(jobIds).toHaveLength(5);
        expect(addJobSpy).toHaveBeenCalledTimes(5);
      });
    });

    describe('유효성 검증', () => {
      it('빈 배열 입력 시 빈 배열을 반환한다', async () => {
        const addJobSpy = vi.spyOn(adapter, 'addJob');
        const jobIds = await adapter.addBulkJobs('test-queue', []);

        expect(jobIds).toEqual([]);
        expect(addJobSpy).not.toHaveBeenCalled();
      });

      it('chunkSize가 0이면 에러를 throw한다', async () => {
        const jobs = [{jobName: 'TestJob', args: ['arg']}];

        await expect(adapter.addBulkJobs('test-queue', jobs, 0)).rejects.toThrow(
          'chunkSize must be a positive number',
        );
      });

      it('chunkSize가 음수면 에러를 throw한다', async () => {
        const jobs = [{jobName: 'TestJob', args: ['arg']}];

        await expect(adapter.addBulkJobs('test-queue', jobs, -1)).rejects.toThrow(
          'chunkSize must be a positive number',
        );
      });

      it('등록되지 않은 Job 클래스는 에러를 throw한다', async () => {
        const jobs = [{jobName: 'UnregisteredJob', args: ['arg']}];

        await expect(adapter.addBulkJobs('test-queue', jobs)).rejects.toThrow(
          "Job class 'UnregisteredJob' not found",
        );
      });
    });

    describe('옵션 전달', () => {
      it('Job 옵션이 각 Job에 전달된다', async () => {
        const jobs = [
          {
            jobName: 'TestJob',
            args: ['arg1'],
            options: {timeout: 5000, maxAttempts: 3},
          },
          {
            jobName: 'TestJob',
            args: ['arg2'],
            options: {timeout: 10000},
          },
        ];

        const addJobSpy = vi.spyOn(adapter, 'addJob');
        await adapter.addBulkJobs('test-queue', jobs);

        expect(addJobSpy).toHaveBeenNthCalledWith(
          1,
          'test-queue',
          'TestJob',
          ['arg1'],
          {timeout: 5000, maxAttempts: 3},
        );
        expect(addJobSpy).toHaveBeenNthCalledWith(2, 'test-queue', 'TestJob', ['arg2'], {
          timeout: 10000,
        });
      });
    });

    describe('DEFAULT_CHUNK_SIZE 상수', () => {
      it('기본 청크 크기는 100이다', () => {
        expect(DEFAULT_CHUNK_SIZE).toBe(100);
      });
    });
  });

  describe('registerJob', () => {
    it('Job 클래스를 등록한다', () => {
      class MyJob {
        async run() {}
      }

      adapter.registerJob('MyJob', MyJob as any);

      expect(adapter.getRegisteredJob('MyJob')).toBe(MyJob);
    });

    it('등록되지 않은 Job은 undefined를 반환한다', () => {
      expect(adapter.getRegisteredJob('NonExistent')).toBeUndefined();
    });
  });

  describe('getAllRegisteredJobs', () => {
    it('모든 등록된 Job을 반환한다', () => {
      class Job1 {
        async run() {}
      }
      class Job2 {
        async run() {}
      }

      adapter.registerJob('Job1', Job1 as any);
      adapter.registerJob('Job2', Job2 as any);

      const jobs = adapter.getAllRegisteredJobs();
      expect(jobs.size).toBe(2);
      expect(jobs.has('Job1')).toBe(true);
      expect(jobs.has('Job2')).toBe(true);
    });
  });
});
