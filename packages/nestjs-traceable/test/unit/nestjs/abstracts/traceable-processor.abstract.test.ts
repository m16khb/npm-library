import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClsService } from 'nestjs-cls';
import { Job } from 'bullmq';
import {
  TraceableProcessor,
  TraceableJobData,
} from '../../../../src/nestjs/abstracts/traceable-processor.abstract';
import { TRACE_ID_KEY } from '../../../../src/nestjs/services/trace-context.service';

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
  public mockResult: TestResult = { success: true, orderId: 'order-123' };

  constructor(cls: ClsService) {
    super(cls);
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
  let mockClsService: ClsService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClsService = {
      get: vi.fn(),
      set: vi.fn(),
      isActive: vi.fn().mockReturnValue(true),
      run: vi.fn((fn: () => unknown) => fn()),
    } as unknown as ClsService;

    processor = new TestProcessor(mockClsService);
  });

  describe('process', () => {
    it('Job의 traceId를 CLS에 설정하고 executeJob을 호출한다', async () => {
      const job = {
        data: { userId: 123, amount: 1000, traceId: 'job-trace-id' },
        id: 'job-1',
      } as Job<TestJobData>;

      const result = await processor.process(job);

      expect(result).toEqual({ success: true, orderId: 'order-123' });
      expect(mockClsService.run).toHaveBeenCalled();
      expect(mockClsService.set).toHaveBeenCalledWith(TRACE_ID_KEY, 'job-trace-id');
      expect(processor.executedJobs).toContain(job);
    });

    it('Job에 traceId가 없으면 새로 생성한다', async () => {
      const job = {
        data: { userId: 123, amount: 1000 },
        id: 'job-1',
      } as Job<TestJobData>;

      await processor.process(job);

      expect(mockClsService.set).toHaveBeenCalledWith(TRACE_ID_KEY, expect.stringMatching(/^[0-9a-f-]{36}$/));
    });

    it('executeJob의 결과를 반환한다', async () => {
      const expectedResult = { success: false, orderId: 'order-456' };
      processor.mockResult = expectedResult;
      const job = {
        data: { userId: 123, amount: 1000, traceId: 'test-trace' },
      } as Job<TestJobData>;

      const result = await processor.process(job);

      expect(result).toEqual(expectedResult);
    });

    it('executeJob에서 에러가 발생하면 전파한다', async () => {
      class ErrorProcessor extends TraceableProcessor<TestJobData, TestResult> {
        constructor(cls: ClsService) {
          super(cls);
        }

        protected async executeJob(): Promise<TestResult> {
          throw new Error('Job failed');
        }
      }

      const errorProcessor = new ErrorProcessor(mockClsService);
      const job = {
        data: { userId: 123, amount: 1000, traceId: 'test-trace' },
      } as Job<TestJobData>;

      await expect(errorProcessor.process(job)).rejects.toThrow('Job failed');
    });
  });

  describe('getTraceId', () => {
    it('CLS에서 traceId를 가져온다', () => {
      const expectedTraceId = 'test-trace-123';
      vi.mocked(mockClsService.get).mockReturnValue(expectedTraceId);

      const result = processor.testGetTraceId();

      expect(result).toBe(expectedTraceId);
      expect(mockClsService.get).toHaveBeenCalledWith(TRACE_ID_KEY);
    });

    it('CLS가 비활성화되면 undefined 반환', () => {
      vi.mocked(mockClsService.isActive).mockReturnValue(false);

      const result = processor.testGetTraceId();

      expect(result).toBeUndefined();
    });
  });
});
