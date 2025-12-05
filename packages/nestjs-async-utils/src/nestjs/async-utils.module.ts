import {Module} from '@nestjs/common';
import type {DynamicModule, Provider} from '@nestjs/common';

import {ASYNC_UTILS_MODULE_OPTIONS} from './constants.js';
import type {
  AsyncUtilsModuleOptions,
  AsyncUtilsModuleAsyncOptions,
  AsyncUtilsOptionsFactory,
} from './interfaces/module-options.interface.js';
import {ConcurrencyManagerService} from './services/concurrency-manager.service.js';
import {AsyncUtilsLoggerService} from './services/async-utils-logger.service.js';

/**
 * NestJS 비동기 유틸리티 모듈
 *
 * @Retryable, @Timeout, @ConcurrencyLimit 데코레이터를 사용하기 위한 모듈입니다.
 *
 * @example
 * ```typescript
 * // 기본 사용
 * @Module({
 *   imports: [AsyncUtilsModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // 커스텀 설정
 * @Module({
 *   imports: [
 *     AsyncUtilsModule.forRoot({
 *       defaultRetries: 5,
 *       defaultTimeout: 10000,
 *       defaultConcurrency: 20,
 *       enableLogging: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // 커스텀 로거 사용
 * @Module({
 *   imports: [
 *     AsyncUtilsModule.forRoot({
 *       logger: new CustomLogger(), // LoggerService 구현체
 *       enableLogging: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // 글로벌 모듈 비활성화
 * @Module({
 *   imports: [
 *     AsyncUtilsModule.forRoot({
 *       isGlobal: false, // 해당 모듈에서만 사용
 *     }),
 *   ],
 * })
 * export class FeatureModule {}
 *
 * // 비동기 설정 (ConfigService 사용)
 * @Module({
 *   imports: [
 *     AsyncUtilsModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (config: ConfigService) => ({
 *         defaultTimeout: config.get('ASYNC_TIMEOUT'),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class AsyncUtilsModule {
  /**
   * 동기 설정으로 모듈 등록
   *
   * @param options 모듈 옵션 (isGlobal 기본값: true)
   * @returns DynamicModule
   */
  static forRoot(options: AsyncUtilsModuleOptions = {}): DynamicModule {
    const isGlobal = options.isGlobal ?? true;

    return {
      module: AsyncUtilsModule,
      global: isGlobal,
      providers: [
        {
          provide: ASYNC_UTILS_MODULE_OPTIONS,
          useValue: options,
        },
        ConcurrencyManagerService,
        AsyncUtilsLoggerService,
      ],
      exports: [ASYNC_UTILS_MODULE_OPTIONS, ConcurrencyManagerService, AsyncUtilsLoggerService],
    };
  }

  /**
   * 비동기 설정으로 모듈 등록
   *
   * @param options 비동기 모듈 옵션 (isGlobal 기본값: true)
   * @returns DynamicModule
   */
  static forRootAsync(options: AsyncUtilsModuleAsyncOptions): DynamicModule {
    return {
      module: AsyncUtilsModule,
      global: options.isGlobal ?? true,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        ConcurrencyManagerService,
        AsyncUtilsLoggerService,
      ],
      exports: [ASYNC_UTILS_MODULE_OPTIONS, ConcurrencyManagerService, AsyncUtilsLoggerService],
    };
  }

  /**
   * 비동기 프로바이더 생성
   */
  private static createAsyncProviders(options: AsyncUtilsModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: ASYNC_UTILS_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
        {
          provide: ASYNC_UTILS_MODULE_OPTIONS,
          useFactory: async (optionsFactory: AsyncUtilsOptionsFactory) =>
            optionsFactory.createAsyncUtilsOptions(),
          inject: [options.useClass],
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: ASYNC_UTILS_MODULE_OPTIONS,
          useFactory: async (optionsFactory: AsyncUtilsOptionsFactory) =>
            optionsFactory.createAsyncUtilsOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    return [
      {
        provide: ASYNC_UTILS_MODULE_OPTIONS,
        useValue: {},
      },
    ];
  }
}
