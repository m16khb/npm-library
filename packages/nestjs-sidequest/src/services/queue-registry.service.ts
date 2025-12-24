import {Inject, Injectable, Logger} from '@nestjs/common';
import {SIDEQUEST_MODULE_OPTIONS, DEFAULT_CHUNK_SIZE} from '../constants.js';
import {SidequestAdapter} from '../core/sidequest.adapter.js';
import type {SidequestModuleOptions, QueueConfig} from '../interfaces/module-options.interface.js';
import type {IQueueService, JobAddOptions, BulkJobOptions} from '../interfaces/queue.interface.js';

/**
 * Queue 레지스트리 서비스
 *
 * 큐 인스턴스를 관리하고 @InjectQueue()를 위한 DI 프로바이더를 제공합니다.
 */
@Injectable()
export class QueueRegistryService {
  private readonly logger = new Logger(QueueRegistryService.name);
  private readonly queueServices = new Map<string, IQueueService>();

  constructor(
    @Inject(SIDEQUEST_MODULE_OPTIONS)
    private readonly options: SidequestModuleOptions,
    private readonly adapter: SidequestAdapter,
  ) {
    this.initializeQueues();
  }

  /**
   * 설정된 큐 초기화
   */
  private initializeQueues(): void {
    const queues = this.options.queues ?? [];

    for (const queueConfig of queues) {
      this.registerQueue(queueConfig);
    }

    // 기본 큐가 없으면 생성
    if (!this.queueServices.has('default')) {
      this.registerQueue({name: 'default'});
    }
  }

  /**
   * 큐 등록
   */
  registerQueue(config: QueueConfig): void {
    const queueService = this.createQueueService(config.name);
    this.queueServices.set(config.name, queueService);
    this.logger.log(`Queue '${config.name}' registered`);
  }

  /**
   * 큐 서비스 조회
   */
  getQueue(name: string): IQueueService | undefined {
    return this.queueServices.get(name);
  }

  /**
   * 큐 서비스 조회 (없으면 에러)
   */
  getQueueOrThrow(name: string): IQueueService {
    const queue = this.getQueue(name);
    if (!queue) {
      throw new Error(
        `Queue '${name}' not found. Make sure it is registered in SidequestModule.forRoot().`,
      );
    }
    return queue;
  }

  /**
   * 모든 큐 조회
   */
  getAllQueues(): Map<string, IQueueService> {
    return this.queueServices;
  }

  /**
   * 큐 서비스 인스턴스 생성
   */
  private createQueueService(queueName: string): IQueueService {
    const adapter = this.adapter;

    return {
      name: queueName,

      async add<T>(JobClass: new (...args: unknown[]) => T, ...args: unknown[]): Promise<string> {
        const jobName = JobClass.name;
        return adapter.addJob(queueName, jobName, args);
      },

      async addWithOptions<T>(
        JobClass: new (...args: unknown[]) => T,
        options: JobAddOptions,
        ...args: unknown[]
      ): Promise<string> {
        const jobName = JobClass.name;
        return adapter.addJob(queueName, jobName, args, options);
      },

      async addScheduled<T>(
        JobClass: new (...args: unknown[]) => T,
        scheduledAt: Date,
        ...args: unknown[]
      ): Promise<string> {
        const jobName = JobClass.name;
        return adapter.addJob(queueName, jobName, args, {scheduledAt});
      },

      async addBulk<T>(
        jobs: Array<{
          JobClass: new (...args: unknown[]) => T;
          args: unknown[];
          options?: JobAddOptions;
        }>,
        options?: BulkJobOptions,
      ): Promise<string[]> {
        // 빈 배열 조기 반환
        if (jobs.length === 0) {
          return [];
        }

        const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;

        // chunkSize 유효성 검증
        if (chunkSize <= 0) {
          throw new Error(
            `BulkJobOptions.chunkSize must be a positive number, got: ${chunkSize}`,
          );
        }

        const bulkJobs = jobs.map(job => {
          const result: {jobName: string; args: unknown[]; options?: JobAddOptions} = {
            jobName: job.JobClass.name,
            args: job.args,
          };
          if (job.options !== undefined) {
            result.options = job.options;
          }
          return result;
        });
        return adapter.addBulkJobs(queueName, bulkJobs, chunkSize);
      },
    };
  }
}
