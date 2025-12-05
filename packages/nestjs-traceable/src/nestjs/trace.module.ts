import {
  DynamicModule,
  Global,
  Module,
} from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import {
  DEFAULT_TRACE_HEADER,
  TRACE_OPTIONS,
} from './constants';
import {
  TraceModuleOptions,
  TraceModuleAsyncOptions,
} from './interfaces';
import { TraceContextService, TRACE_ID_KEY } from './services/trace-context.service';

/**
 * NestJS 추적 모듈
 *
 * nestjs-cls를 사용하여 traceId 추적 기능을 제공한다.
 * spanId 관리는 otel에 위임.
 *
 * @example
 * ```typescript
 * // app.module.ts
 * import { TraceModule } from '@m16khb/nestjs-traceable';
 *
 * @Module({
 *   imports: [
 *     TraceModule.forRoot({
 *       headerName: 'X-Trace-Id',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class TraceModule {
  /**
   * 동기 방식으로 모듈을 설정한다.
   */
  static forRoot(options?: TraceModuleOptions): DynamicModule {
    const headerName = options?.headerName ?? DEFAULT_TRACE_HEADER;

    return {
      module: TraceModule,
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: {
            mount: true,
            generateId: true,
            idGenerator: (req) => {
              // 헤더에서 traceId 추출, 없으면 새로 생성
              const headerKey = headerName.toLowerCase();
              return (req.headers[headerKey] as string) ?? randomUUID();
            },
            setup: (cls, req) => {
              // traceId를 CLS에 설정
              cls.set(TRACE_ID_KEY, cls.getId());

              // 응답 헤더에 traceId 설정
              const res = req.res;
              if (res && !res.headersSent) {
                res.setHeader(headerName, cls.getId() ?? '');
              }
            },
          },
        }),
      ],
      providers: [
        {
          provide: TRACE_OPTIONS,
          useValue: {
            headerName,
            ...options,
          },
        },
        TraceContextService,
      ],
      exports: [
        TRACE_OPTIONS,
        TraceContextService,
        ClsModule,
      ],
    };
  }

  /**
   * 비동기 방식으로 모듈을 설정한다.
   * 이미 ClsModule이 설정된 경우 사용.
   */
  static forRootAsync(asyncOptions: TraceModuleAsyncOptions): DynamicModule {
    return {
      module: TraceModule,
      imports: asyncOptions.imports || [],
      providers: [
        {
          provide: TRACE_OPTIONS,
          useFactory: async (...args: unknown[]) => {
            const config = await asyncOptions.useFactory(...args);
            return {
              headerName: DEFAULT_TRACE_HEADER,
              ...config,
            };
          },
          inject: asyncOptions.inject || [],
        },
        TraceContextService,
      ],
      exports: [
        TRACE_OPTIONS,
        TraceContextService,
      ],
    };
  }

  /**
   * 이미 ClsModule이 설정된 경우 사용.
   * ClsModule을 중복 import하지 않고 TraceContextService만 등록한다.
   */
  static register(): DynamicModule {
    return {
      module: TraceModule,
      providers: [
        {
          provide: TRACE_OPTIONS,
          useValue: {
            headerName: DEFAULT_TRACE_HEADER,
          },
        },
        TraceContextService,
      ],
      exports: [
        TRACE_OPTIONS,
        TraceContextService,
      ],
    };
  }
}
