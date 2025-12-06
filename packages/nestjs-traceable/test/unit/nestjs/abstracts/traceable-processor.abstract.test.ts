import {describe, it, expect, beforeEach, vi} from 'vitest';
import {Job} from 'bullmq';
import {
  TraceableProcessor,
  TraceableJobData,
} from '../../../../src/nestjs/abstracts/traceable-processor.abstract';
import {TraceContextService} from '../../../../src/nestjs/services/trace-context.service';

interface TestJobData extends TraceableJobData {
  userId: number;
  amount: number;
}

interface TestResult {
  success: boolean;
  orderId: string;
}

// 테스트용 구체 클래스
class TestProcessor extends TraceableProcessor<TestJobData, TestResult> {
  public executedJobs: Job<TestJobData>[] = [];
  public mockResult: TestResult = {success: true, orderId: 'order-123'};

  constructor(traceContext: TraceContextService) {
    super(traceContext);
  }

  protected async executeJob(job: Job<TestJobData>): Promise<TestResult> {
    this.executedJobs.push(job);
    return this.mockResult;
  }

  // protected 메서드를 테스트용으로 노출
  public testGetTraceId() {
    return this.getTraceId();
  }
}

describe('TraceableProcessor', () => {
  let processor: TestProcessor;
  let mockTraceContext: TraceContextService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTraceContext = {
      getTraceId: vi.fn(),
      setTraceId: vi.fn(),
      runAsync: vi.fn((fn: () => Promise<unknown>) => fn()),
      set: vi.fn(),
      get: vi.fn(),
    } as unknown as TraceContextService;

    processor = new TestProcessor(mockTraceContext);
  });

  describe('process', () => {
    it('Job의 traceId를 CLS에 설정하고 executeJob을 호출한다', async () => {
      const job = {
        data: {userId: 123, amount: 1000, traceId: 'job-trace-id'},
        id: 'job-1',
      } as Job<TestJobData>;

      const result = await processor.process(job);

      expect(result).toEqual({success: true, orderId: 'order-123'});
      expect(mockTraceContext.runAsync).toHaveBeenCalledWith(expect.any(Function), 'job-trace-id');
      expect(processor.executedJobs).toContain(job);
    });

    it('Job에 traceId가 없으면 undefined를 전달한다', async () => {
      const job = {
        data: {userId: 123, amount: 1000},
        id: 'job-1',
      } as Job<TestJobData>;

      await processor.process(job);

      expect(mockTraceContext.runAsync).toHaveBeenCalledWith(expect.any(Function), undefined);
    });

    it('executeJob의 결과를 반환한다', async () => {
      const expectedResult = {success: false, orderId: 'order-456'};
      processor.mockResult = expectedResult;
      const job = {
        data: {userId: 123, amount: 1000, traceId: 'test-trace'},
      } as Job<TestJobData>;

      const result = await processor.process(job);

      expect(result).toEqual(expectedResult);
    });

    it('executeJob에서 에러가 발생하면 전파한다', async () => {
      class ErrorProcessor extends TraceableProcessor<TestJobData, TestResult> {
        constructor(traceContext: TraceContextService) {
          super(traceContext);
        }

        protected async executeJob(): Promise<TestResult> {
          throw new Error('Job failed');
        }
      }

      const errorProcessor = new ErrorProcessor(mockTraceContext);
      const job = {
        data: {userId: 123, amount: 1000, traceId: 'test-trace'},
      } as Job<TestJobData>;

      await expect(errorProcessor.process(job)).rejects.toThrow('Job failed');
    });
  });

  describe('getTraceId', () => {
    it('TraceContextService에서 traceId를 가져온다', () => {
      const expectedTraceId = 'test-trace-123';
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(expectedTraceId);

      const result = processor.testGetTraceId();

      expect(result).toBe(expectedTraceId);
      expect(mockTraceContext.getTraceId).toHaveBeenCalled();
    });

    it('traceId가 없으면 undefined 반환', () => {
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(undefined);

      const result = processor.testGetTraceId();

      expect(result).toBeUndefined();
    });
  });
});
