import {Injectable, Logger} from '@nestjs/common';
import {Sidequest, Job, JobBuilder} from 'sidequest';
import type {SidequestModuleOptions} from '../interfaces/module-options.interface.js';
import type {JobAddOptions, JobInfo, JobState, ErrorData} from '../interfaces/queue.interface.js';

// Job 클래스 타입
type JobClassType = new (...args: unknown[]) => Job;

/**
 * Sidequest.js API Adapter
 *
 * Sidequest.js의 API를 NestJS와 통합합니다.
 * 실제 sidequest 패키지를 사용하여 Job 처리를 수행합니다.
 */
@Injectable()
export class SidequestAdapter {
  private readonly logger = new Logger(SidequestAdapter.name);
  private isStarted = false;
  private readonly registeredJobs = new Map<string, JobClassType>();

  /**
   * Sidequest 엔진 시작
   */
  async start(options: SidequestModuleOptions): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('Sidequest engine is already started');
      return;
    }

    this.logger.log('Starting Sidequest engine...');

    try {
      // Sidequest 설정 구성
      const config: Record<string, unknown> = {
        backend: {
          driver: options.backend.driver,
          config: options.backend.config,
        },
      };

      // 큐 설정
      if (options.queues) {
        config.queues = options.queues.map(q => ({
          name: q.name,
          concurrency: q.concurrency,
          priority: q.priority,
          state: q.state,
        }));
      }

      // 엔진 설정
      if (options.maxConcurrentJobs !== undefined) {
        config.maxConcurrentJobs = options.maxConcurrentJobs;
      }
      if (options.minThreads !== undefined) {
        config.minThreads = options.minThreads;
      }
      if (options.maxThreads !== undefined) {
        config.maxThreads = options.maxThreads;
      }
      if (options.jobPollingInterval !== undefined) {
        config.jobPollingInterval = options.jobPollingInterval;
      }
      if (options.releaseStaleJobsIntervalMin !== undefined) {
        config.releaseStaleJobsIntervalMin = options.releaseStaleJobsIntervalMin;
      }
      if (options.cleanupFinishedJobsIntervalMin !== undefined) {
        config.cleanupFinishedJobsIntervalMin = options.cleanupFinishedJobsIntervalMin;
      }

      // 로거 설정
      if (options.logger) {
        config.logger = {
          level: options.logger.level ?? 'info',
          json: options.logger.json ?? false,
        };
      }

      // 대시보드 설정
      if (options.dashboard) {
        config.dashboard = options.dashboard;
      }

      // Sidequest 엔진 시작
      await Sidequest.start(config as Parameters<typeof Sidequest.start>[0]);

      this.isStarted = true;
      this.logger.log('Sidequest engine started');
    } catch (error) {
      this.logger.error('Failed to start Sidequest engine', error);
      throw error;
    }
  }

  /**
   * Sidequest 엔진 종료
   */
  async shutdown(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.logger.log('Stopping Sidequest engine...');

    try {
      await Sidequest.stop();
      this.isStarted = false;
      this.logger.log('Sidequest engine stopped');
    } catch (error) {
      this.logger.error('Failed to stop Sidequest engine', error);
      throw error;
    }
  }

  /**
   * Job 클래스 등록
   */
  registerJob(jobName: string, JobClass: JobClassType): void {
    this.registeredJobs.set(jobName, JobClass);
    this.logger.debug(`Job '${jobName}' registered`);
  }

  /**
   * Job 추가
   */
  async addJob(
    queueName: string,
    jobName: string,
    args: unknown[],
    options?: JobAddOptions,
  ): Promise<string> {
    const JobClass = this.registeredJobs.get(jobName);
    if (!JobClass) {
      throw new Error(`Job class '${jobName}' not found. Make sure it's registered.`);
    }

    let builder: JobBuilder<JobClassType> = Sidequest.build(JobClass)
      .queue(queueName);

    // 옵션 적용
    if (options?.maxAttempts !== undefined) {
      builder = builder.maxAttempts(options.maxAttempts);
    }
    if (options?.timeout !== undefined) {
      builder = builder.timeout(options.timeout);
    }
    if (options?.priority !== undefined) {
      // priority는 queue 레벨에서 설정됨
    }
    if (options?.scheduledAt !== undefined) {
      builder = builder.availableAt(options.scheduledAt);
    }
    if (options?.retryDelay !== undefined) {
      builder = builder.retryDelay(options.retryDelay);
    }
    if (options?.backoffStrategy !== undefined) {
      builder = builder.backoffStrategy(options.backoffStrategy);
    }
    if (options?.uniqueKey !== undefined) {
      builder = builder.unique(true);
    }

    // Job 실행 (enqueue)
    const jobData = await builder.enqueue(...args);
    const jobId = String(jobData?.id ?? `job_${Date.now()}`);

    this.logger.debug(`Job '${jobName}' (ID: ${jobId}) added to Queue '${queueName}'`);

    return jobId;
  }

  /**
   * Bulk Job 추가
   */
  async addBulkJobs(
    queueName: string,
    jobs: Array<{jobName: string; args: unknown[]; options?: JobAddOptions}>,
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const {jobName, args, options} of jobs) {
      const jobId = await this.addJob(queueName, jobName, args, options);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Job 조회
   */
  async getJob(jobId: string | number): Promise<JobInfo | undefined> {
    try {
      const numericId = typeof jobId === 'string' ? parseInt(jobId, 10) : jobId;
      if (isNaN(numericId)) {
        return undefined;
      }

      const job = await Sidequest.job.get(numericId);
      if (!job) {
        return undefined;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobData = job as any;

      return {
        id: String(job.id),
        name: jobData.name as string | undefined,
        queue: job.queue,
        state: job.state as JobState,
        attempt: job.attempt,
        maxAttempts: job.max_attempts,
        insertedAt: job.inserted_at,
        attemptedAt: job.attempted_at ?? undefined,
        completedAt: job.completed_at ?? undefined,
        result: job.result,
        errors: job.errors as ErrorData[] | null | undefined,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * 엔진 시작 여부
   */
  get started(): boolean {
    return this.isStarted;
  }

  /**
   * 등록된 Job 클래스 반환
   */
  getRegisteredJob(jobName: string): JobClassType | undefined {
    return this.registeredJobs.get(jobName);
  }

  /**
   * 모든 등록된 Job 클래스 반환
   */
  getAllRegisteredJobs(): Map<string, JobClassType> {
    return this.registeredJobs;
  }
}

// Job 베이스 클래스 re-export
export {Job} from 'sidequest';
