/**
 * @m16khb/nestjs-sidequest
 *
 * NestJS integration for Sidequest.js - Database-native background job processing
 *
 * @example
 * ```typescript
 * // 모듈 등록
 * @Module({
 *   imports: [
 *     SidequestModule.forRoot({
 *       backend: {
 *         driver: '@sidequest/postgres-backend',
 *         config: process.env.DATABASE_URL,
 *       },
 *       queues: [
 *         { name: 'email', concurrency: 5 },
 *       ],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // Processor 정의
 * @Processor('email')
 * export class EmailProcessor {
 *   @OnJob('SendWelcomeEmailJob')
 *   @Retry({ maxAttempts: 3, backoff: 'exponential' })
 *   async handleWelcomeEmail(job: JobContext) {
 *     await this.mailer.send(job.data);
 *   }
 *
 *   @OnJobComplete('SendWelcomeEmailJob')
 *   async onComplete(event: JobCompleteEvent) {
 *     console.log('Email sent:', event.result);
 *   }
 * }
 *
 * // 서비스에서 Job 추가
 * @Injectable()
 * export class UserService {
 *   constructor(@InjectQueue('email') private emailQueue: IQueueService) {}
 *
 *   async createUser(email: string) {
 *     await this.emailQueue.add(SendWelcomeEmailJob, email, 'Welcome!');
 *   }
 * }
 * ```
 */

// Module
export {SidequestModule} from './modules/index.js';

// Decorators
export {
  Processor,
  OnJob,
  Retry,
  InjectQueue,
  OnJobComplete,
  OnJobFailed,
  type JobCompleteEvent,
  type JobFailedEvent,
} from './decorators/index.js';

// Services
export {
  SidequestEngineService,
  QueueRegistryService,
  ProcessorRegistryService,
  ClsIntegrationService,
} from './services/index.js';

// Core
export {SidequestAdapter, Job} from './core/index.js';

// Interfaces
export type {
  // Module Options
  BackendConfig,
  QueueConfig,
  DashboardConfig,
  GracefulShutdownConfig,
  SidequestModuleOptions,
  SidequestModuleAsyncOptions,
  SidequestOptionsFactory,
  // Processor
  ProcessorOptions,
  ProcessorMetadata,
  OnJobOptions,
  OnJobMetadata,
  RegisteredHandler,
  RetryOptions,
  RegisteredProcessor,
  // Queue
  IQueueService,
  JobAddOptions,
  JobInfo,
  JobState,
} from './interfaces/index.js';

// Constants
export {
  SIDEQUEST_MODULE_OPTIONS,
  SIDEQUEST_ENGINE,
  PROCESSOR_METADATA_KEY,
  ON_JOB_METADATA_KEY,
  RETRY_OPTIONS_METADATA_KEY,
  ON_JOB_COMPLETE_METADATA_KEY,
  ON_JOB_FAILED_METADATA_KEY,
  QUEUE_TOKEN_PREFIX,
  getQueueToken,
  DEFAULT_QUEUE_NAME,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_TIMEOUT,
  DEFAULT_CONCURRENCY,
} from './constants.js';
