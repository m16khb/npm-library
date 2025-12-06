import {Queue, JobsOptions} from 'bullmq';
import {randomUUID} from 'crypto';
import {TraceContextService} from '../services/trace-context.service';
import type {TraceableJobData} from './traceable-processor.abstract';

/**
 * TraceableQueueService - CLS에서 traceId를 자동으로 추출하여 Job 데이터에 주입하는 추상 큐 서비스
 *
 * 모든 큐 서비스는 이 클래스를 상속받아 traceId 주입 코드 중복을 제거합니다.
 * 크론 → 큐 → 프로세서 간 로그 연속성을 자동으로 보장합니다.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PaymentQueueService extends TraceableQueueService<PaymentJobData> {
 *   constructor(
 *     @InjectQueue('payment') queue: Queue,
 *     traceContext: TraceContextService,
 *   ) {
 *     super(queue, traceContext);
 *   }
 *
 *   async addPaymentJob(data: PaymentJobData): Promise<string> {
 *     return this.addJob('process', data, {
 *       priority: 5,
 *       attempts: 3,
 *     });
 *   }
 *
 *   async addBulkPaymentJobs(items: PaymentJobData[]): Promise<string[]> {
 *     return this.addBulkJobs('process', items.map(data => ({ data })));
 *   }
 * }
 * ```
 *
 * @benefits
 * - traceId 주입 코드 중복 제거
 * - 크론 컨텍스트의 traceId를 프로세서까지 자동 전달
 * - 일관된 로그 추적 보장
 * - 큐 상태 조회 유틸리티 제공
 *
 * @typeParam TJobData - Job 데이터 타입 (traceId는 자동 추가됨)
 */
export abstract class TraceableQueueService<TJobData extends object> {
  /**
   * @param queue - BullMQ Queue 인스턴스
   * @param traceContext - TraceContextService 인스턴스 (필수)
   */
  constructor(
    protected readonly queue: Queue,
    protected readonly traceContext: TraceContextService,
  ) {}

  /**
   * traceId가 자동 주입된 Job을 큐에 추가
   *
   * CLS 컨텍스트에서 traceId를 가져와 Job 데이터에 추가합니다.
   * traceId가 없으면 새로 생성합니다.
   *
   * @param name - Job 이름
   * @param data - Job 데이터 (traceId는 자동 추가)
   * @param options - BullMQ Job 옵션
   * @returns Job ID
   */
  protected async addJob(name: string, data: TJobData, options?: JobsOptions): Promise<string> {
    const jobDataWithTrace = this.addTraceId(data);
    const job = await this.queue.add(name, jobDataWithTrace, options);
    return job.id ?? '';
  }

  /**
   * 여러 Job을 한 번에 큐에 추가
   *
   * 모든 Job에 동일한 traceId가 주입됩니다.
   *
   * @param name - Job 이름
   * @param jobs - 추가할 Job 배열
   * @returns Job ID 배열
   */
  protected async addBulkJobs(
    name: string,
    jobs: Array<{data: TJobData; opts?: JobsOptions}>,
  ): Promise<string[]> {
    const traceId = this.getCurrentTraceId();
    const bulkJobs = jobs.map(job => {
      const bulkJob: {name: string; data: TJobData & TraceableJobData; opts?: JobsOptions} = {
        name,
        data: {...job.data, traceId} as TJobData & TraceableJobData,
      };
      if (job.opts) {
        bulkJob.opts = job.opts;
      }
      return bulkJob;
    });

    const results = await this.queue.addBulk(bulkJobs);
    return results.map(job => job.id ?? '');
  }

  /**
   * 데이터에 traceId 추가 (배치 작업용 헬퍼)
   *
   * @param data - Job 데이터
   * @returns traceId가 추가된 데이터
   */
  protected addTraceId(data: TJobData): TJobData & TraceableJobData {
    return {
      ...data,
      traceId: this.getCurrentTraceId(),
    };
  }

  /**
   * 현재 CLS 컨텍스트에서 traceId를 가져오거나 새로 생성
   */
  private getCurrentTraceId(): string {
    return this.traceContext.getTraceId() ?? randomUUID();
  }

  /**
   * 큐 이름 조회
   */
  get queueName(): string {
    return this.queue.name;
  }

  /**
   * 큐에 대기 중인 Job 수 조회
   */
  async getWaitingCount(): Promise<number> {
    return this.queue.getWaitingCount();
  }

  /**
   * 큐에서 활성 Job 수 조회
   */
  async getActiveCount(): Promise<number> {
    return this.queue.getActiveCount();
  }

  /**
   * 큐에서 완료된 Job 수 조회
   */
  async getCompletedCount(): Promise<number> {
    return this.queue.getCompletedCount();
  }

  /**
   * 큐에서 실패한 Job 수 조회
   */
  async getFailedCount(): Promise<number> {
    return this.queue.getFailedCount();
  }
}
