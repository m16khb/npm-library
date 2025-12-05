// Module
export { TraceModule } from './trace.module';

// Services
export { TraceContextService, TRACE_ID_KEY } from './services/trace-context.service';

// Abstract Classes (Primary API)
export {
  TraceableCronService,
  TraceableProcessor,
  TraceableQueueService,
  type TraceableJobData,
} from './abstracts';

// Decorators (Utility)
export { Trace, Traceable } from './decorators';

// Interceptors
export {
  TraceInterceptor,
  TraceGrpcInterceptor,
  TraceKafkaInterceptor,
  createKafkaTraceHeaders,
} from './interceptors';

// Logger
export {
  TraceableLogger,
  TraceableLoggerModule,
  TRACEABLE_LOGGER_OPTIONS,
  type TraceableLoggerModuleOptions,
  type TraceableLoggerModuleAsyncOptions,
  type LogLevel,
  type LogMeta,
} from './logger';

// Interfaces
export type {
  TraceModuleOptions,
  TraceModuleAsyncOptions,
  TraceModuleFactoryOptions,
} from './interfaces';

// Constants
export {
  DEFAULT_TRACE_HEADER,
  TRACE_METADATA_KEY,
  TRACEABLE_METADATA_KEY,
  DEFAULT_TRACE_ENABLED,
  TRACE_ID_MAX_LENGTH,
  LOG_MESSAGES,
  TRACE_OPTIONS,
} from './constants';
