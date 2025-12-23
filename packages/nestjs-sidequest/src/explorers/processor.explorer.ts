import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {DiscoveryService, MetadataScanner, Reflector} from '@nestjs/core';
import {InstanceWrapper} from '@nestjs/core/injector/instance-wrapper';
import {
  PROCESSOR_METADATA_KEY,
  ON_JOB_METADATA_KEY,
  RETRY_OPTIONS_METADATA_KEY,
  ON_JOB_COMPLETE_METADATA_KEY,
  ON_JOB_FAILED_METADATA_KEY,
} from '../constants.js';
import {ProcessorRegistryService} from '../services/processor-registry.service.js';
import type {
  ProcessorMetadata,
  OnJobMetadata,
  RetryOptions,
  RegisteredHandler,
  RegisteredProcessor,
} from '../interfaces/processor.interface.js';

/**
 * Processor Explorer
 *
 * 애플리케이션 시작 시 @Processor 데코레이터가 붙은 클래스를 스캔하고,
 * @OnJob, @Retry, @OnJobComplete, @OnJobFailed 메타데이터를 수집하여
 * ProcessorRegistry에 등록합니다.
 */
@Injectable()
export class ProcessorExplorer implements OnModuleInit {
  private readonly logger = new Logger(ProcessorExplorer.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly processorRegistry: ProcessorRegistryService,
  ) {}

  /**
   * 모듈 초기화 시 프로세서 스캔
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Scanning for processors...');
    await this.explore();
    this.logger.log('Processor scan completed');
  }

  /**
   * 모든 프로바이더를 스캔하여 @Processor 클래스 찾기
   */
  async explore(): Promise<void> {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      await this.processWrapper(wrapper);
    }
  }

  /**
   * 프로바이더 래퍼 처리
   */
  private async processWrapper(wrapper: InstanceWrapper): Promise<void> {
    const {instance, metatype} = wrapper;

    // 인스턴스와 메타타입이 없으면 스킵
    if (!instance || !metatype) {
      return;
    }

    // @Processor 메타데이터 확인
    const processorMetadata = this.reflector.get<ProcessorMetadata>(
      PROCESSOR_METADATA_KEY,
      metatype,
    );

    if (!processorMetadata) {
      return;
    }

    // 핸들러 스캔
    const handlers = this.scanHandlers(instance, metatype);
    const completeHandlers = this.scanCompleteHandlers(instance, metatype);
    const failedHandlers = this.scanFailedHandlers(instance, metatype);

    // 프로세서 등록
    const registeredProcessor: RegisteredProcessor = {
      queueName: processorMetadata.queueName,
      instance,
      metatype,
      handlers,
      completeHandlers,
      failedHandlers,
    };

    this.processorRegistry.register(registeredProcessor);

    this.logger.log(
      `Processor '${metatype.name}' registered (Queue: ${processorMetadata.queueName}, Handlers: ${handlers.size})`,
    );
  }

  /**
   * @OnJob 메서드 스캔
   */
  private scanHandlers(instance: unknown, _metatype: object): Map<string, RegisteredHandler> {
    const handlers = new Map<string, RegisteredHandler>();
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);

    for (const methodName of methodNames) {
      const methodRef = prototype[methodName];

      // @OnJob 메타데이터 확인
      const onJobMetadata = this.reflector.get<OnJobMetadata>(ON_JOB_METADATA_KEY, methodRef);

      if (!onJobMetadata) {
        continue;
      }

      // @Retry 메타데이터 확인
      const retryOptions = this.reflector.get<RetryOptions>(RETRY_OPTIONS_METADATA_KEY, methodRef);

      const handler: RegisteredHandler = {
        methodName,
        jobName: onJobMetadata.jobName,
        options: onJobMetadata.options,
        retryOptions,
      };

      handlers.set(onJobMetadata.jobName, handler);

      this.logger.debug(`  - Job '${onJobMetadata.jobName}' -> ${methodName}()`);
    }

    return handlers;
  }

  /**
   * @OnJobComplete 메서드 스캔
   */
  private scanCompleteHandlers(instance: unknown, _metatype: object): Map<string, string> {
    const handlers = new Map<string, string>();
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);

    for (const methodName of methodNames) {
      const methodRef = prototype[methodName];

      // @OnJobComplete 메타데이터 확인
      const jobName = this.reflector.get<string | undefined>(
        ON_JOB_COMPLETE_METADATA_KEY,
        methodRef,
      );

      if (jobName !== undefined) {
        // jobName이 빈 문자열이면 모든 Job에 대해 호출 ('*')
        const key = jobName || '*';
        handlers.set(key, methodName);
        this.logger.debug(`  - OnJobComplete '${key}' -> ${methodName}()`);
      }
    }

    return handlers;
  }

  /**
   * @OnJobFailed 메서드 스캔
   */
  private scanFailedHandlers(instance: unknown, _metatype: object): Map<string, string> {
    const handlers = new Map<string, string>();
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);

    for (const methodName of methodNames) {
      const methodRef = prototype[methodName];

      // @OnJobFailed 메타데이터 확인
      const jobName = this.reflector.get<string | undefined>(ON_JOB_FAILED_METADATA_KEY, methodRef);

      if (jobName !== undefined) {
        // jobName이 빈 문자열이면 모든 Job에 대해 호출 ('*')
        const key = jobName || '*';
        handlers.set(key, methodName);
        this.logger.debug(`  - OnJobFailed '${key}' -> ${methodName}()`);
      }
    }

    return handlers;
  }
}
