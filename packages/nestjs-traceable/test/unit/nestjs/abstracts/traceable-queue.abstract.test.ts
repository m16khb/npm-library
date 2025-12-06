import {describe, it, expect, beforeEach, vi} from 'vitest';
import {Queue} from 'bullmq';
import {TraceableQueueService} from '../../../../src/nestjs/abstracts/traceable-queue.abstract';
import {TraceContextService} from '../../../../src/nestjs/services/trace-context.service';

interface TestJobData {
  userId: number;
  amount: number;
}

// 테스트용 구체 클래스
class TestQueueService extends TraceableQueueService<TestJobData> {
  constructor(queue: Queue, traceContext: TraceContextService) {
    super(queue, traceContext);
  }

  // protected 메서드를 테스트용으로 노출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async testAddJob(name: string, data: TestJobData, options?: any) {
    return this.addJob(name, data, options);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async testAddBulkJobs(name: string, jobs: Array<{data: TestJobData; opts?: any}>) {
    return this.addBulkJobs(name, jobs);
  }

  public testAddTraceId(data: TestJobData) {
    return this.addTraceId(data);
  }
}

describe('TraceableQueueService', () => {
  let service: TestQueueService;
  let mockTraceContext: TraceContextService;
  let mockQueue: Queue;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTraceContext = {
      getTraceId: vi.fn(),
      setTraceId: vi.fn(),
      runAsync: vi.fn((fn: () => Promise<unknown>) => fn()),
      set: vi.fn(),
      get: vi.fn(),
    } as unknown as TraceContextService;

    mockQueue = {
      name: 'test-queue',
      add: vi.fn().mockResolvedValue({id: 'job-1'}),
      addBulk: vi.fn().mockResolvedValue([{id: 'job-1'}, {id: 'job-2'}]),
      getWaitingCount: vi.fn().mockResolvedValue(5),
      getActiveCount: vi.fn().mockResolvedValue(2),
      getCompletedCount: vi.fn().mockResolvedValue(100),
      getFailedCount: vi.fn().mockResolvedValue(3),
    } as unknown as Queue;

    service = new TestQueueService(mockQueue, mockTraceContext);
  });

  describe('addJob', () => {
    it('Job 데이터에 traceId를 자동 주입한다', async () => {
      const traceId = 'test-trace-id';
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(traceId);

      await service.testAddJob('process', {userId: 123, amount: 1000});

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process',
        {userId: 123, amount: 1000, traceId: 'test-trace-id'},
        undefined,
      );
    });

    it('traceId가 없으면 새 traceId를 생성한다', async () => {
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(undefined);

      await service.testAddJob('process', {userId: 123, amount: 1000});

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process',
        {userId: 123, amount: 1000, traceId: expect.stringMatching(/^[0-9a-f-]{36}$/)},
        undefined,
      );
    });

    it('Job ID를 반환한다', async () => {
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue('trace-id');
      const result = await service.testAddJob('process', {userId: 123, amount: 1000});

      expect(result).toBe('job-1');
    });

    it('Job 옵션을 전달한다', async () => {
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue('trace-id');
      const opts = {priority: 5, attempts: 3};

      await service.testAddJob('process', {userId: 123, amount: 1000}, opts);

      expect(mockQueue.add).toHaveBeenCalledWith('process', expect.any(Object), opts);
    });
  });

  describe('addBulkJobs', () => {
    it('모든 Job에 동일한 traceId를 주입한다', async () => {
      const traceId = 'bulk-trace-id';
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(traceId);

      await service.testAddBulkJobs('process', [
        {data: {userId: 1, amount: 100}},
        {data: {userId: 2, amount: 200}},
      ]);

      expect(mockQueue.addBulk).toHaveBeenCalledWith([
        {name: 'process', data: {userId: 1, amount: 100, traceId: 'bulk-trace-id'}},
        {name: 'process', data: {userId: 2, amount: 200, traceId: 'bulk-trace-id'}},
      ]);
    });

    it('Job ID 배열을 반환한다', async () => {
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue('trace-id');
      const result = await service.testAddBulkJobs('process', [
        {data: {userId: 1, amount: 100}},
        {data: {userId: 2, amount: 200}},
      ]);

      expect(result).toEqual(['job-1', 'job-2']);
    });
  });

  describe('addTraceId', () => {
    it('데이터에 traceId를 추가한다', () => {
      const traceId = 'helper-trace-id';
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(traceId);

      const result = service.testAddTraceId({userId: 123, amount: 1000});

      expect(result).toEqual({userId: 123, amount: 1000, traceId: 'helper-trace-id'});
    });
  });

  describe('queueName', () => {
    it('큐 이름을 반환한다', () => {
      expect(service.queueName).toBe('test-queue');
    });
  });

  describe('getWaitingCount', () => {
    it('대기 중인 Job 수를 반환한다', async () => {
      const result = await service.getWaitingCount();

      expect(result).toBe(5);
      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
    });
  });

  describe('getActiveCount', () => {
    it('활성 Job 수를 반환한다', async () => {
      const result = await service.getActiveCount();

      expect(result).toBe(2);
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
    });
  });

  describe('getCompletedCount', () => {
    it('완료된 Job 수를 반환한다', async () => {
      const result = await service.getCompletedCount();

      expect(result).toBe(100);
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
    });
  });

  describe('getFailedCount', () => {
    it('실패한 Job 수를 반환한다', async () => {
      const result = await service.getFailedCount();

      expect(result).toBe(3);
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
    });
  });
});
