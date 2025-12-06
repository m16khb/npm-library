/**
 * 통합 테스트: 전체 traceId 흐름 검증
 *
 * 다양한 진입점(HTTP, Cron, BullMQ)에서의 traceId 전파와 로그 연속성을 테스트합니다.
 */
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Test, TestingModule} from '@nestjs/testing';
import {Injectable} from '@nestjs/common';
import {ClsModule, ClsService} from 'nestjs-cls';
import {randomUUID} from 'crypto';

import {TraceModule} from '../../src/nestjs/trace.module';
import {TraceContextService, TRACE_ID_KEY} from '../../src/nestjs/services/trace-context.service';
import {TraceableCronService} from '../../src/nestjs/abstracts/traceable-cron.abstract';
import {TraceableProcessor, TraceableJobData} from '../../src/nestjs/abstracts/traceable-processor.abstract';
import {TraceableQueueService} from '../../src/nestjs/abstracts/traceable-queue.abstract';

// 테스트용 서비스
@Injectable()
class TestLogService {
  logs: Array<{message: string; traceId?: string}> = [];

  log(message: string, traceId?: string): void {
    this.logs.push({message, traceId});
  }

  clear(): void {
    this.logs = [];
  }
}

// 테스트용 Cron 서비스
@Injectable()
class TestCronService extends TraceableCronService {
  constructor(
    traceContext: TraceContextService,
    private readonly logService: TestLogService,
  ) {
    super(traceContext);
  }

  async runDailyReport(): Promise<string> {
    return this.runWithTrace(async () => {
      const traceId = this.getTraceId();
      this.logService.log('Daily report started', traceId);
      await new Promise(resolve => setTimeout(resolve, 10));
      this.logService.log('Daily report completed', traceId);
      return traceId!;
    });
  }

  async runWithSpecificTraceId(traceId: string): Promise<string> {
    return this.runWithTrace(async () => {
      const currentTraceId = this.getTraceId();
      this.logService.log('Running with specific traceId', currentTraceId);
      return currentTraceId!;
    }, traceId);
  }
}

// 테스트용 Job 데이터
interface TestJobData extends TraceableJobData {
  taskId: string;
  payload: string;
}

// 테스트용 Processor
class TestProcessor extends TraceableProcessor<TestJobData, string> {
  processedJobs: Array<{taskId: string; traceId?: string}> = [];

  constructor(
    traceContext: TraceContextService,
    private readonly logService: TestLogService,
  ) {
    super(traceContext);
  }

  protected async executeJob(job: {data: TestJobData; id?: string}): Promise<string> {
    const traceId = this.getTraceId();
    this.logService.log(`Processing job ${job.data.taskId}`, traceId);
    this.processedJobs.push({taskId: job.data.taskId, traceId});
    return `completed-${job.data.taskId}`;
  }

  clear(): void {
    this.processedJobs = [];
  }
}

// 테스트용 Queue 서비스
@Injectable()
class TestQueueService extends TraceableQueueService<TestJobData> {
  enqueuedJobs: Array<{name: string; data: unknown}> = [];
  private mockQueue: {
    add: ReturnType<typeof vi.fn>;
    addBulk: ReturnType<typeof vi.fn>;
    name: string;
  };

  constructor(traceContext: TraceContextService) {
    // Mock queue
    const mockQueue = {
      name: 'test-queue',
      add: vi.fn().mockImplementation((name: string, data: unknown) =>
        Promise.resolve({
          id: randomUUID(),
          name,
          data,
        }),
      ),
      addBulk: vi.fn().mockImplementation((jobs: Array<{name: string; data: unknown}>) =>
        Promise.resolve(
          jobs.map(j => ({
            id: randomUUID(),
            name: j.name,
            data: j.data,
          })),
        ),
      ),
    };
    super(mockQueue as never, traceContext);
    this.mockQueue = mockQueue;
  }

  async enqueueTask(taskId: string, payload: string): Promise<{id: string; data: TestJobData}> {
    const dataWithTrace = this.addTraceId({taskId, payload} as TestJobData);
    const job = await this.mockQueue.add('process-task', dataWithTrace);
    this.enqueuedJobs.push({name: 'process-task', data: job.data});
    return job;
  }

  async enqueueBulkTasks(
    tasks: Array<{taskId: string; payload: string}>,
  ): Promise<Array<{id: string; data: TestJobData}>> {
    const jobIds = await this.addBulkJobs(
      'process-task',
      tasks.map(t => ({data: t as TestJobData})),
    );
    return jobIds.map((id, i) => ({
      id,
      data: {...tasks[i], traceId: this.addTraceId(tasks[i] as TestJobData).traceId} as TestJobData,
    }));
  }

  clear(): void {
    this.enqueuedJobs = [];
    this.mockQueue.add.mockClear();
    this.mockQueue.addBulk.mockClear();
  }
}

describe('TraceFlow 통합 테스트', () => {
  let module: TestingModule;
  let traceContextService: TraceContextService;
  let logService: TestLogService;
  let cronService: TestCronService;
  let processor: TestProcessor;
  let queueService: TestQueueService;
  let cls: ClsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ClsModule.forRoot({global: true}), TraceModule.forRoot()],
      providers: [TestLogService, TestCronService, TestQueueService],
    }).compile();

    traceContextService = module.get<TraceContextService>(TraceContextService);
    logService = module.get<TestLogService>(TestLogService);
    cronService = module.get<TestCronService>(TestCronService);
    queueService = module.get<TestQueueService>(TestQueueService);
    cls = module.get<ClsService>(ClsService);
    processor = new TestProcessor(traceContextService, logService);

    logService.clear();
    queueService.clear();
    processor.clear();
  });

  describe('시나리오 1: Cron → Queue → Processor 전체 흐름', () => {
    it('Cron에서 생성된 traceId가 Processor까지 전파된다', async () => {
      // 1. Cron 실행 - 새 traceId 생성
      const cronTraceId = await cronService.runDailyReport();
      expect(cronTraceId).toBeDefined();
      expect(cronTraceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // 2. Cron 내에서 Queue에 작업 추가 (시뮬레이션)
      await cls.run(async () => {
        cls.set(TRACE_ID_KEY, cronTraceId);
        await queueService.enqueueTask('task-001', 'test payload');
      });

      // 3. Queue에 추가된 작업에 traceId가 포함되었는지 확인
      expect(queueService.enqueuedJobs).toHaveLength(1);
      const enqueuedJob = queueService.enqueuedJobs[0];
      expect((enqueuedJob.data as TestJobData).traceId).toBe(cronTraceId);

      // 4. Processor에서 작업 처리 (시뮬레이션)
      await processor.process({
        id: 'job-1',
        data: {
          taskId: 'task-001',
          payload: 'test payload',
          traceId: cronTraceId,
        },
      } as never);

      // 5. Processor에서 동일한 traceId 사용 확인
      expect(processor.processedJobs).toHaveLength(1);
      expect(processor.processedJobs[0].traceId).toBe(cronTraceId);

      // 6. 모든 로그에서 동일한 traceId 확인
      const logsWithCronTraceId = logService.logs.filter(l => l.traceId === cronTraceId);
      expect(logsWithCronTraceId.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('시나리오 2: 다중 동시 요청 컨텍스트 격리', () => {
    it('동시에 실행되는 여러 요청이 서로 다른 traceId를 가진다', async () => {
      const results = await Promise.all([
        cronService.runDailyReport(),
        cronService.runDailyReport(),
        cronService.runDailyReport(),
      ]);

      // 모든 traceId가 서로 다름
      const uniqueTraceIds = new Set(results);
      expect(uniqueTraceIds.size).toBe(3);

      // 각 traceId가 UUID 형식
      results.forEach(traceId => {
        expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      });
    });

    it('대량 동시 요청 (100개)에서도 컨텍스트 격리가 유지된다', async () => {
      const count = 100;
      const results = await Promise.all(Array.from({length: count}, () => cronService.runDailyReport()));

      const uniqueTraceIds = new Set(results);
      expect(uniqueTraceIds.size).toBe(count);
    });
  });

  describe('시나리오 3: 외부 traceId 전파', () => {
    it('외부에서 전달받은 traceId를 그대로 사용한다', async () => {
      const externalTraceId = 'external-trace-12345';
      const result = await cronService.runWithSpecificTraceId(externalTraceId);

      expect(result).toBe(externalTraceId);
      expect(logService.logs[0].traceId).toBe(externalTraceId);
    });

    it('Processor에서 외부 traceId를 복원한다', async () => {
      const externalTraceId = 'external-from-kafka-67890';

      await processor.process({
        id: 'external-job',
        data: {
          taskId: 'external-task',
          payload: 'from external',
          traceId: externalTraceId,
        },
      } as never);

      expect(processor.processedJobs[0].traceId).toBe(externalTraceId);
    });
  });

  describe('시나리오 4: traceId 없는 Job 처리', () => {
    it('traceId가 없는 Job은 새로운 traceId를 생성한다', async () => {
      await processor.process({
        id: 'no-trace-job',
        data: {
          taskId: 'no-trace-task',
          payload: 'no trace',
          // traceId 없음
        },
      } as never);

      expect(processor.processedJobs[0].traceId).toBeDefined();
      expect(processor.processedJobs[0].traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('시나리오 5: 중첩 컨텍스트', () => {
    it('중첩된 runWithTrace에서 각각 독립적인 traceId를 가진다', async () => {
      const outerTraceId = await cls.run(async () => {
        cls.set(TRACE_ID_KEY, 'outer-trace-id');

        // 내부에서 새로운 컨텍스트 생성
        const innerTraceId = await cronService.runDailyReport();

        // 내부 컨텍스트는 별도의 traceId
        expect(innerTraceId).not.toBe('outer-trace-id');

        return cls.get<string>(TRACE_ID_KEY);
      });

      // 외부 컨텍스트의 traceId는 유지됨
      expect(outerTraceId).toBe('outer-trace-id');
    });
  });

  describe('시나리오 6: TraceContextService 직접 사용', () => {
    it('run() 메서드로 새 컨텍스트 생성', () => {
      const result = traceContextService.run(() => {
        const traceId = traceContextService.getTraceId();
        expect(traceId).toBeDefined();
        return traceId;
      });

      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('run() 메서드로 특정 traceId로 컨텍스트 생성', () => {
      const specificTraceId = 'specific-trace-123';
      const result = traceContextService.run(() => {
        return traceContextService.getTraceId();
      }, specificTraceId);

      expect(result).toBe(specificTraceId);
    });

    it('runAsync() 메서드로 비동기 컨텍스트 생성', async () => {
      const result = await traceContextService.runAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return traceContextService.getTraceId();
      });

      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('isSameTrace()로 traceId 비교', () => {
      const specificTraceId = 'compare-trace-456';
      traceContextService.run(() => {
        expect(traceContextService.isSameTrace(specificTraceId)).toBe(true);
        expect(traceContextService.isSameTrace('different-id')).toBe(false);
      }, specificTraceId);
    });
  });

  describe('시나리오 7: 에러 발생 시 traceId 유지', () => {
    it('executeJob에서 에러 발생해도 traceId는 올바르게 설정됨', async () => {
      class ErrorProcessor extends TraceableProcessor<TestJobData, string> {
        capturedTraceId?: string;

        constructor(traceContext: TraceContextService) {
          super(traceContext);
        }

        protected async executeJob(): Promise<string> {
          this.capturedTraceId = this.getTraceId();
          throw new Error('Job failed');
        }
      }

      const errorProcessor = new ErrorProcessor(traceContextService);
      const testTraceId = 'error-trace-789';

      await expect(
        errorProcessor.process({
          id: 'error-job',
          data: {taskId: 'error-task', payload: '', traceId: testTraceId},
        } as never),
      ).rejects.toThrow('Job failed');

      expect(errorProcessor.capturedTraceId).toBe(testTraceId);
    });
  });

  describe('시나리오 8: Queue 서비스 대량 작업', () => {
    it('여러 작업을 큐에 추가할 때 동일한 traceId가 포함된다', async () => {
      const bulkTraceId = 'bulk-trace-id';

      await cls.run(async () => {
        cls.set(TRACE_ID_KEY, bulkTraceId);

        // 개별 작업 추가
        const job1 = await queueService.enqueueTask('task-1', 'payload-a');
        const job2 = await queueService.enqueueTask('task-2', 'payload-b');
        const job3 = await queueService.enqueueTask('task-3', 'payload-c');

        expect(job1.data.traceId).toBe(bulkTraceId);
        expect(job2.data.traceId).toBe(bulkTraceId);
        expect(job3.data.traceId).toBe(bulkTraceId);
      });
    });

    it('CLS 컨텍스트 없이 작업 추가 시 새 traceId가 생성된다', async () => {
      // CLS 컨텍스트 외부에서 호출
      const job = await queueService.enqueueTask('no-context-task', 'payload');

      expect(job.data.traceId).toBeDefined();
      expect(job.data.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });
});
