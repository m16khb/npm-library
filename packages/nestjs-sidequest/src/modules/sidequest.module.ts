import {DynamicModule, Global, Module, Provider} from '@nestjs/common';
import {DiscoveryModule} from '@nestjs/core';
import {SIDEQUEST_MODULE_OPTIONS, getQueueToken} from '../constants.js';
import {SidequestAdapter} from '../core/sidequest.adapter.js';
import type {
  SidequestModuleOptions,
  SidequestModuleAsyncOptions,
  SidequestOptionsFactory,
} from '../interfaces/module-options.interface.js';
import {SidequestEngineService} from '../services/sidequest-engine.service.js';
import {QueueRegistryService} from '../services/queue-registry.service.js';
import {ProcessorRegistryService} from '../services/processor-registry.service.js';
import {ClsIntegrationService} from '../services/cls-integration.service.js';
import {ProcessorExplorer} from '../explorers/processor.explorer.js';

/**
 * SidequestModule
 *
 * NestJS에서 Sidequest.js를 사용하기 위한 메인 모듈입니다.
 *
 * @example
 * ```typescript
 * // 동기 설정
 * @Module({
 *   imports: [
 *     SidequestModule.forRoot({
 *       backend: {
 *         driver: '@sidequest/postgres-backend',
 *         config: process.env.DATABASE_URL,
 *       },
 *       queues: [
 *         { name: 'email', concurrency: 5 },
 *         { name: 'report', concurrency: 2 },
 *       ],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // 비동기 설정 (ConfigService 사용)
 * @Module({
 *   imports: [
 *     SidequestModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (config: ConfigService) => ({
 *         backend: {
 *           driver: '@sidequest/postgres-backend',
 *           config: config.get('DATABASE_URL'),
 *         },
 *         queues: [{ name: 'default' }],
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class SidequestModule {
  /**
   * 동기 설정으로 모듈 등록
   */
  static forRoot(options: SidequestModuleOptions): DynamicModule {
    const isGlobal = options.isGlobal ?? true;
    const queueProviders = this.createQueueProviders(options);

    return {
      module: SidequestModule,
      global: isGlobal,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: SIDEQUEST_MODULE_OPTIONS,
          useValue: options,
        },
        SidequestAdapter,
        SidequestEngineService,
        QueueRegistryService,
        ProcessorRegistryService,
        ClsIntegrationService,
        ProcessorExplorer,
        ...queueProviders,
      ],
      exports: [
        SIDEQUEST_MODULE_OPTIONS,
        SidequestAdapter,
        SidequestEngineService,
        QueueRegistryService,
        ProcessorRegistryService,
        ClsIntegrationService,
        ...queueProviders.map(p => (p as {provide: symbol | string}).provide),
      ],
    };
  }

  /**
   * 비동기 설정으로 모듈 등록
   */
  static forRootAsync(asyncOptions: SidequestModuleAsyncOptions): DynamicModule {
    const isGlobal = asyncOptions.isGlobal ?? true;

    return {
      module: SidequestModule,
      global: isGlobal,
      imports: [DiscoveryModule, ...(asyncOptions.imports || [])],
      providers: [
        ...this.createAsyncProviders(asyncOptions),
        SidequestAdapter,
        SidequestEngineService,
        QueueRegistryService,
        ProcessorRegistryService,
        ClsIntegrationService,
        ProcessorExplorer,
        // 동적 큐 프로바이더 - options에서 queues를 읽어 생성
        {
          provide: 'SIDEQUEST_QUEUE_PROVIDERS_INIT',
          useFactory: () => {
            // QueueRegistryService가 자동으로 큐를 초기화하므로 별도 처리 불필요
            return true;
          },
          inject: [QueueRegistryService],
        },
      ],
      exports: [
        SIDEQUEST_MODULE_OPTIONS,
        SidequestAdapter,
        SidequestEngineService,
        QueueRegistryService,
        ProcessorRegistryService,
        ClsIntegrationService,
      ],
    };
  }

  /**
   * 큐별 DI 프로바이더 생성
   */
  private static createQueueProviders(options: SidequestModuleOptions): Provider[] {
    const queues = options.queues ?? [{name: 'default'}];

    return queues.map(queue => ({
      provide: getQueueToken(queue.name),
      useFactory: (registry: QueueRegistryService) => registry.getQueueOrThrow(queue.name),
      inject: [QueueRegistryService],
    }));
  }

  /**
   * 비동기 프로바이더 생성
   */
  private static createAsyncProviders(asyncOptions: SidequestModuleAsyncOptions): Provider[] {
    if (asyncOptions.useFactory) {
      return [
        {
          provide: SIDEQUEST_MODULE_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: asyncOptions.inject || [],
        },
      ];
    }

    if (asyncOptions.useClass) {
      return [
        {
          provide: asyncOptions.useClass,
          useClass: asyncOptions.useClass,
        },
        {
          provide: SIDEQUEST_MODULE_OPTIONS,
          useFactory: async (optionsFactory: SidequestOptionsFactory) =>
            optionsFactory.createSidequestOptions(),
          inject: [asyncOptions.useClass],
        },
      ];
    }

    if (asyncOptions.useExisting) {
      return [
        {
          provide: SIDEQUEST_MODULE_OPTIONS,
          useFactory: async (optionsFactory: SidequestOptionsFactory) =>
            optionsFactory.createSidequestOptions(),
          inject: [asyncOptions.useExisting],
        },
      ];
    }

    // useFactory, useClass, useExisting 중 하나는 반드시 제공되어야 함
    throw new Error(
      'SidequestModule.forRootAsync() requires one of: useFactory, useClass, or useExisting. ' +
        'Please provide options configuration.',
    );
  }
}
