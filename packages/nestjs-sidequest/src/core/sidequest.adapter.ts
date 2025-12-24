import {Injectable, Logger} from '@nestjs/common';
import {Sidequest, Job, JobBuilder} from 'sidequest';
import type {SidequestModuleOptions} from '../interfaces/module-options.interface.js';
import type {JobAddOptions, JobInfo, JobState, ErrorData} from '../interfaces/queue.interface.js';
import {DEFAULT_CHUNK_SIZE} from '../constants.js';

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

    let builder: JobBuilder<JobClassType> = Sidequest.build(JobClass).queue(queueName);

    // 옵션 적용
    if (options?.maxAttempts !== undefined) {
      builder = builder.maxAttempts(options.maxAttempts);
    }
    if (options?.timeout !== undefined) {
      builder = builder.timeout(options.timeout);
    }
    // Note: options?.priority는 현재 지원되지 않음 (큐 레벨 priority만 사용 가능)
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
   * Bulk Job 추가 (청크 처리)
   *
   * Sidequest.js에 bulk API가 없으므로 청크로 나누어 순차 처리합니다.
   * 청크 크기가 크면 메모리 사용량이 증가하지만 DB 부하가 감소합니다.
   *
   * @param queueName - 큐 이름
   * @param jobs - Job 목록
   * @param chunkSize - 청크 크기 (기본값: 100)
   * @returns Job ID 배열
   */
  async addBulkJobs(
    queueName: string,
    jobs: Array<{jobName: string; args: unknown[]; options?: JobAddOptions}>,
    chunkSize: number = DEFAULT_CHUNK_SIZE,
  ): Promise<string[]> {
    // chunkSize 유효성 검증
    if (chunkSize <= 0) {
      throw new Error(`chunkSize must be a positive number, got: ${chunkSize}`);
    }

    // 빈 배열 조기 반환
    if (jobs.length === 0) {
      this.logger.debug(`No jobs to add for Queue '${queueName}'`);
      return [];
    }

    const jobIds: string[] = [];
    const totalChunks = Math.ceil(jobs.length / chunkSize);

    // 청크로 나누어 순차 처리
    for (let i = 0; i < jobs.length; i += chunkSize) {
      const chunkIndex = Math.floor(i / chunkSize) + 1;
      const chunk = jobs.slice(i, i + chunkSize);

      this.logger.debug(
        `Processing chunk ${chunkIndex}/${totalChunks} (${chunk.length} jobs) for Queue '${queueName}'`,
      );

      // 청크 내 Job은 순차적으로 추가
      for (const {jobName, args, options} of chunk) {
        const jobId = await this.addJob(queueName, jobName, args, options);
        jobIds.push(jobId);
      }
    }

    this.logger.log(
      `Bulk job completed: ${jobIds.length} jobs added to Queue '${queueName}' in ${totalChunks} chunk(s)`,
    );

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
