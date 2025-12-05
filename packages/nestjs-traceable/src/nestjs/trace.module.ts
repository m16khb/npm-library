import {
  DynamicModule,
  Global,
  Module,
  Provider,
} from '@nestjs/common';
import {
  DEFAULT_MAX_SPAN_DEPTH,
  DEFAULT_TRACE_ENABLED,
  DEFAULT_AUTO_CLEANUP,
  DEFAULT_WARN_UNFINISHED,
  DEFAULT_TRACE_HEADER,
  TRACE_OPTIONS,
  TRACE_CONTEXT_MANAGER,
} from './constants';
import {
  TraceModuleOptions,
  TraceModuleAsyncOptions,
  ClsImplementation,
} from './interfaces';
import { TraceContextManager } from '../core/context';
import { ClsTraceContextManager } from '../core/context/trace-context-manager.cls';
import { DefaultTraceIdGenerator } from '../core/generators/trace-id.generator';
import { DefaultSpanIdGenerator } from '../core/generators/span-id.generator';
import { AsyncLocalStorageClsAdapter, NestjsClsAdapter } from '../adapters';

/**
 * NestJS 추적 모듈
 * 애플리케이션 전체에 추적 기능을 제공한다.
 */
@Global()
@Module({})
export class TraceModule {
  /**
   * 동기 방식으로 모듈을 설정한다.
   */
  static forRoot(options?: TraceModuleOptions): DynamicModule {
    const traceOptionsProvider = this.createOptionsProvider(options);
    const contextManagerProvider = this.createContextManagerProvider(options);
    const imports = this.createImports(options);

    return {
      module: TraceModule,
      imports,
      providers: [
        traceOptionsProvider,
        contextManagerProvider,
      ],
      exports: [
        TRACE_OPTIONS,
        TRACE_CONTEXT_MANAGER,
      ],
    };
  }

  /**
   * 비동기 방식으로 모듈을 설정한다.
   */
  static forRootAsync(asyncOptions: TraceModuleAsyncOptions): DynamicModule {
    const traceOptionsProvider = this.createAsyncOptionsProvider(asyncOptions);
    const contextManagerProvider = this.createAsyncContextManagerProvider();
    const imports = this.createImports(asyncOptions);

    return {
      module: TraceModule,
      imports: [...(asyncOptions.imports || []), ...imports],
      providers: [
        traceOptionsProvider,
        contextManagerProvider,
      ],
      exports: [
        TRACE_OPTIONS,
        TRACE_CONTEXT_MANAGER,
      ],
    };
  }

  /**
   * CLS 구현에 따라 필요한 imports를 생성한다.
   */
  private static createImports(options?: TraceModuleOptions): any[] {
    const clsImplementation = options?.clsImplementation ?? 'async-local-storage';

    if (clsImplementation === 'nestjs-cls') {
      try {
        // 동적으로 import
        const ClsModule = require('nestjs-cls').ClsModule;
        return [
          ClsModule.forRoot(options?.clsOptions ?? {
            middleware: { mount: true },
          }),
        ];
      } catch (error) {
        throw new Error(
          'nestjs-cls is not installed. Please install it: npm install nestjs-cls',
        );
      }
    }

    return [];
  }

  /**
   * 옵션 프로바이더를 생성한다.
   */
  private static createOptionsProvider(options?: TraceModuleOptions): Provider {
    return {
      provide: TRACE_OPTIONS,
      useValue: {
        headerName: DEFAULT_TRACE_HEADER,
        maxSpanDepth: DEFAULT_MAX_SPAN_DEPTH,
        enabled: DEFAULT_TRACE_ENABLED,
        autoCleanupSpans: DEFAULT_AUTO_CLEANUP,
        warnOnUnfinishedSpans: DEFAULT_WARN_UNFINISHED,
        ...options,
      },
    };
  }

  /**
   * 비동기 옵션 프로바이더를 생성한다.
   */
  private static createAsyncOptionsProvider(
    asyncOptions: TraceModuleAsyncOptions,
  ): Provider {
    return {
      provide: TRACE_OPTIONS,
      useFactory: async (...args: any[]) => {
        const config = await asyncOptions.useFactory(...args);
        return {
          headerName: DEFAULT_TRACE_HEADER,
          maxSpanDepth: DEFAULT_MAX_SPAN_DEPTH,
          enabled: DEFAULT_TRACE_ENABLED,
          autoCleanupSpans: DEFAULT_AUTO_CLEANUP,
          warnOnUnfinishedSpans: DEFAULT_WARN_UNFINISHED,
          ...config,
        };
      },
      inject: asyncOptions.inject || [],
    };
  }

  /**
   * 컨텍스트 관리자 프로바이더를 생성한다.
   */
  private static createContextManagerProvider(
    options?: TraceModuleOptions,
  ): Provider {
    return {
      provide: TRACE_CONTEXT_MANAGER,
      useFactory: (traceOptions: TraceModuleOptions) => {
        const clsImplementation = traceOptions?.clsImplementation ?? 'async-local-storage';
        const traceIdGenerator = options?.traceIdGenerator ??
          traceOptions?.traceIdGenerator ??
          new DefaultTraceIdGenerator();

        const spanIdGenerator = options?.spanIdGenerator ??
          traceOptions?.spanIdGenerator ??
          new DefaultSpanIdGenerator();

        if (clsImplementation === 'nestjs-cls') {
          // nestjs-cls 사용
          try {
            const { ClsService } = require('nestjs-cls');
            const clsAdapter = new NestjsClsAdapter(new ClsService());
            return new ClsTraceContextManager(
              clsAdapter,
              traceIdGenerator,
              spanIdGenerator,
            );
          } catch (error) {
            throw new Error(
              'nestjs-cls is not installed. Please install it: npm install nestjs-cls',
            );
          }
        } else {
          // 기본 AsyncLocalStorage 사용
          const { AsyncLocalStorageManager } = require('../core/context');
          const storage = new AsyncLocalStorageManager();
          const { AsyncLocalStorageClsAdapter } = require('../adapters');
          const clsAdapter = new AsyncLocalStorageClsAdapter(storage);
          return new ClsTraceContextManager(
            clsAdapter,
            traceIdGenerator,
            spanIdGenerator,
          );
        }
      },
      inject: [TRACE_OPTIONS],
    };
  }

  /**
   * 비동기 컨텍스트 관리자 프로바이더를 생성한다.
   */
  private static createAsyncContextManagerProvider(): Provider {
    return {
      provide: TRACE_CONTEXT_MANAGER,
      useFactory: (traceOptions: TraceModuleOptions) => {
        const clsImplementation = traceOptions?.clsImplementation ?? 'async-local-storage';
        const traceIdGenerator = traceOptions?.traceIdGenerator ??
          new DefaultTraceIdGenerator();

        const spanIdGenerator = traceOptions?.spanIdGenerator ??
          new DefaultSpanIdGenerator();

        if (clsImplementation === 'nestjs-cls') {
          // nestjs-cls 사용
          try {
            const { ClsService } = require('nestjs-cls');
            const clsAdapter = new NestjsClsAdapter(new ClsService());
            return new ClsTraceContextManager(
              clsAdapter,
              traceIdGenerator,
              spanIdGenerator,
            );
          } catch (error) {
            throw new Error(
              'nestjs-cls is not installed. Please install it: npm install nestjs-cls',
            );
          }
        } else {
          // 기본 AsyncLocalStorage 사용
          const { AsyncLocalStorageManager } = require('../core/context');
          const storage = new AsyncLocalStorageManager();
          const { AsyncLocalStorageClsAdapter } = require('../adapters');
          const clsAdapter = new AsyncLocalStorageClsAdapter(storage);
          return new ClsTraceContextManager(
            clsAdapter,
            traceIdGenerator,
            spanIdGenerator,
          );
        }
      },
      inject: [TRACE_OPTIONS],
    };
  }
}