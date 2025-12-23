// Module Options
export type {
  BackendConfig,
  QueueConfig,
  DashboardConfig,
  GracefulShutdownConfig,
  SidequestModuleOptions,
  SidequestModuleAsyncOptions,
  SidequestOptionsFactory,
} from './module-options.interface.js';

// Processor
export type {
  ProcessorOptions,
  ProcessorMetadata,
  OnJobOptions,
  OnJobMetadata,
  RegisteredHandler,
  RetryOptions,
  RegisteredProcessor,
} from './processor.interface.js';

// Queue
export type {IQueueService, JobAddOptions, JobInfo, JobState} from './queue.interface.js';
