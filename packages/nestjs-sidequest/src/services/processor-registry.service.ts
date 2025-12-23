import {Injectable, Logger, Optional} from '@nestjs/common';
import type {RegisteredProcessor, RegisteredHandler} from '../interfaces/processor.interface.js';
import {ClsIntegrationService} from './cls-integration.service.js';

/**
 * Processor 레지스트리 서비스
 *
 * @Processor 데코레이터로 등록된 프로세서와 핸들러를 관리합니다.
 */
@Injectable()
export class ProcessorRegistryService {
  private readonly logger = new Logger(ProcessorRegistryService.name);
  private readonly processors = new Map<string, RegisteredProcessor>();

  constructor(
    @Optional() private readonly clsService?: ClsIntegrationService,
  ) {}

  /**
   * 프로세서 등록
   */
  register(processor: RegisteredProcessor): void {
    this.processors.set(processor.queueName, processor);
    this.logger.log(
      `Processor '${processor.metatype.name}' (Queue: ${processor.queueName}) registered`,
    );
  }

  /**
   * 프로세서 조회
   */
  getProcessor(queueName: string): RegisteredProcessor | undefined {
    return this.processors.get(queueName);
  }

  /**
   * 모든 프로세서 조회
   */
  getAllProcessors(): Map<string, RegisteredProcessor> {
    return this.processors;
  }

  /**
   * Job 핸들러 조회
   */
  getJobHandler(queueName: string, jobName: string): RegisteredHandler | undefined {
    const processor = this.processors.get(queueName);
    if (!processor) {
      return undefined;
    }
    return processor.handlers.get(jobName);
  }

  /**
   * Job 완료 핸들러 조회
   */
  getCompleteHandler(queueName: string, jobName: string): string | undefined {
    const processor = this.processors.get(queueName);
    if (!processor) {
      return undefined;
    }
    return processor.completeHandlers.get(jobName) ?? processor.completeHandlers.get('*');
  }

  /**
   * Job 실패 핸들러 조회
   */
  getFailedHandler(queueName: string, jobName: string): string | undefined {
    const processor = this.processors.get(queueName);
    if (!processor) {
      return undefined;
    }
    return processor.failedHandlers.get(jobName) ?? processor.failedHandlers.get('*');
  }

  /**
   * Job 디스패치 (실행)
   *
   * @param queueName - 큐 이름
   * @param jobName - Job 이름
   * @param args - Job 인자
   * @param metadata - Job 메타데이터 (traceId 등)
   */
  async dispatch(
    queueName: string,
    jobName: string,
    args: unknown[],
    metadata?: Record<string, unknown>,
  ): Promise<unknown> {
    const processor = this.processors.get(queueName);
    if (!processor) {
      throw new Error(`Processor not found for Queue '${queueName}'`);
    }

    const handler = processor.handlers.get(jobName);
    if (!handler) {
      throw new Error(`Handler not found for Job '${jobName}' (Queue: ${queueName})`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const instance = processor.instance as Record<string, Function>;
    const method = instance[handler.methodName];

    if (typeof method !== 'function') {
      throw new Error(`Handler method '${handler.methodName}' not found`);
    }

    // CLS context에서 실행
    const executeJob = async (): Promise<unknown> => {
      try {
        const result = await method.apply(processor.instance, args);

        // 완료 핸들러 호출
        const completeHandlerName = this.getCompleteHandler(queueName, jobName);
        if (completeHandlerName) {
          const completeHandler = instance[completeHandlerName];
          if (typeof completeHandler === 'function') {
            await completeHandler.apply(processor.instance, [{jobName, args, result}]);
          }
        }

        return result;
      } catch (error) {
        // 실패 핸들러 호출
        const failedHandlerName = this.getFailedHandler(queueName, jobName);
        if (failedHandlerName) {
          const failedHandler = instance[failedHandlerName];
          if (typeof failedHandler === 'function') {
            await failedHandler.apply(processor.instance, [{jobName, args, error}]);
          }
        }

        throw error;
      }
    };

    // CLS 통합이 활성화되어 있으면 context 내에서 실행
    if (this.clsService?.isEnabled() && metadata) {
      return this.clsService.runInContext(metadata, executeJob);
    }

    return executeJob();
  }
}
