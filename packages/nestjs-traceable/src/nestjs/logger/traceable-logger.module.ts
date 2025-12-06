import {DynamicModule, Global, Module, Type, InjectionToken} from '@nestjs/common';
import {WinstonModule} from 'nest-winston';
import {ClsModule, ClsService} from 'nestjs-cls';
import * as winston from 'winston';
import dayjs from 'dayjs';
import {TraceableLogger, LogLevel} from './traceable.logger';
import {TRACE_ID_KEY} from '../services/trace-context.service';

/**
 * 커스텀 로그 레벨 (TypeORM QUERY 포함)
 * 숫자가 낮을수록 우선순위 높음
 */
const CUSTOM_LEVELS = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    query: 3, // TypeORM queries
    debug: 4,
    verbose: 5,
  },
};

// ANSI 색상 코드 (nestLike 스타일 + QUERY 레벨)
const COLORS: Record<string, string> = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[32m', // green
  query: '\x1b[36m', // cyan (SQL 쿼리)
  debug: '\x1b[35m', // magenta
  verbose: '\x1b[94m', // bright blue
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

// 레벨 표시 이름 (nestLike 스타일)
const LEVEL_NAMES: Record<string, string> = {
  error: 'ERROR',
  warn: 'WARN',
  info: 'LOG',
  query: 'QUERY',
  debug: 'DEBUG',
  verbose: 'VERBOSE',
};

/**
 * TraceableLoggerModule 설정 옵션
 */
export interface TraceableLoggerModuleOptions {
  /** 로그 레벨 (기본: 'info') */
  level?: LogLevel;
  /** 로컬 환경 여부 (true면 Pretty 출력, false면 JSON) */
  isLocal?: boolean;
  /** 앱 이름 (기본: 'Nest') */
  appName?: string;
  /** traceId 표시 길이 (기본: 8, 0이면 전체 표시) */
  traceIdLength?: number;
  /** 타임스탬프 포맷 함수 (로컬 환경에서만 사용) */
  timestampFormat?: () => string;
}

/**
 * TraceableLoggerModule 비동기 설정 옵션
 */
export interface TraceableLoggerModuleAsyncOptions {
  /** 의존성 모듈 */
  imports?: (Type | DynamicModule)[];
  /** Factory 함수에 주입할 프로바이더 */
  inject?: InjectionToken[];
  /** 설정 Factory 함수 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => TraceableLoggerModuleOptions | Promise<TraceableLoggerModuleOptions>;
  /** 전역 모듈 여부 (기본: true) */
  isGlobal?: boolean;
}

/**
 * Logger 옵션 프로바이더 토큰
 */
export const TRACEABLE_LOGGER_OPTIONS = Symbol('TRACEABLE_LOGGER_OPTIONS');

/**
 * 기본 타임스탬프 포맷 (NestJS 기본 스타일)
 * 출력: MM/DD/YYYY, h:mm:ss A (예: 12/06/2025, 12:30:45 AM)
 */
function defaultTimestampFormat(): string {
  return dayjs().format('MM/DD/YYYY, h:mm:ss A');
}

/**
 * Winston format 생성
 */
function createWinstonFormat(
  cls: ClsService,
  options: Required<TraceableLoggerModuleOptions>,
): winston.Logform.Format {
  const traceIdLength = options.traceIdLength;
  const timestampFormat = options.timestampFormat;
  const appName = options.appName;

  // CLS 컨텍스트 주입 format
  const clsContextFormat = winston.format(info => {
    let traceId: string | undefined;
    try {
      if (cls.isActive()) {
        traceId = cls.get<string>(TRACE_ID_KEY);
      }
    } catch {
      // CLS 비활성화 상태
    }

    const msg = info.message ?? '';

    if (options.isLocal) {
      // 로컬: traceId를 메시지 앞에 추가
      if (traceId) {
        const displayId = traceIdLength > 0 ? traceId.slice(0, traceIdLength) : traceId;
        info.message = `[${displayId}] ${msg}`;
      }
    } else {
      // 운영: JSON 필드로 추가
      info.traceId = traceId;
    }

    return info;
  })();

  if (options.isLocal) {
    // 로컬 환경: nestLike 스타일 Pretty 출력
    return winston.format.combine(
      clsContextFormat,
      winston.format.printf(info => {
        const pid = process.pid;
        const timestamp = timestampFormat();
        const context = info.context || 'Application';
        const message = info.message;
        const level = info.level;

        const levelColor = COLORS[level] || '';
        const levelName = LEVEL_NAMES[level] || level.toUpperCase();
        const reset = COLORS.reset;
        const yellow = COLORS.yellow;

        // 기본 필드를 제외한 meta 추출
        const excludeKeys = new Set(['level', 'message', 'context', 'splat']);
        const meta: Record<string, unknown> = {};
        for (const key of Object.keys(info)) {
          if (!excludeKeys.has(key)) {
            meta[key] = info[key];
          }
        }

        // meta가 있으면 메시지 뒤에 한 줄로 표시 (공백 포함 포맷)
        const formatMeta = (obj: Record<string, unknown>) =>
          JSON.stringify(obj, null, 1).replace(/\n\s*/g, ' ');
        const metaSuffix = Object.keys(meta).length > 0 ? ` - ${formatMeta(meta)}` : '';

        return `${levelColor}[${appName}]${reset} ${pid}  - ${timestamp}     ${levelColor}${levelName.padEnd(7)}${reset} ${yellow}[${context}]${reset} ${levelColor}${message}${metaSuffix}${reset}`;
      }),
    );
  } else {
    // 운영 환경: JSON 출력
    return winston.format.combine(
      clsContextFormat,
      // query 레벨에 queryType 필드 추가
      winston.format(info => {
        if (info.level === 'query') {
          info.queryType = 'sql';
        }
        return info;
      })(),
      // ISO8601 형식 + 밀리초
      winston.format.timestamp({format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'}),
      winston.format.json(),
    );
  }
}

/**
 * TraceableLoggerModule - Winston 기반 로거 모듈
 *
 * nest-winston 기반의 Winston 설정을 제공합니다.
 * CLS 컨텍스트에서 traceId를 자동으로 읽어 모든 로그에 포함시킵니다.
 *
 * @example
 * ```typescript
 * // 기본 사용 (로컬 환경)
 * @Module({
 *   imports: [
 *     TraceModule.forRoot(),
 *     TraceableLoggerModule.forRoot({ isLocal: true }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // ConfigService와 함께 사용
 * @Module({
 *   imports: [
 *     TraceModule.forRoot(),
 *     TraceableLoggerModule.forRootAsync({
 *       imports: [ConfigModule],
 *       inject: [ConfigService],
 *       useFactory: (config: ConfigService) => ({
 *         level: config.get('LOG_LEVEL', 'info'),
 *         isLocal: config.get('NODE_ENV') !== 'production',
 *       }),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class TraceableLoggerModule {
  /**
   * 동기 설정으로 모듈 등록
   */
  static forRoot(options: TraceableLoggerModuleOptions = {}): DynamicModule {
    const resolvedOptions = this.resolveOptions(options);

    return {
      module: TraceableLoggerModule,
      imports: [
        ClsModule,
        WinstonModule.forRootAsync({
          imports: [ClsModule],
          inject: [ClsService],
          useFactory: (cls: ClsService) => ({
            levels: CUSTOM_LEVELS.levels,
            level: resolvedOptions.level,
            transports: [
              new winston.transports.Console({
                format: createWinstonFormat(cls, resolvedOptions),
              }),
            ],
          }),
        }),
      ],
      providers: [TraceableLogger],
      exports: [TraceableLogger],
    };
  }

  /**
   * 비동기 설정으로 모듈 등록
   */
  static forRootAsync(asyncOptions: TraceableLoggerModuleAsyncOptions): DynamicModule {
    return {
      module: TraceableLoggerModule,
      global: asyncOptions.isGlobal ?? true,
      imports: [
        ...(asyncOptions.imports ?? []),
        ClsModule,
        WinstonModule.forRootAsync({
          imports: [...(asyncOptions.imports ?? []), ClsModule],
          inject: [...(asyncOptions.inject ?? []), ClsService],
          useFactory: async (...args: unknown[]) => {
            // ClsService는 마지막 인자
            const cls = args[args.length - 1] as ClsService;
            // 나머지는 사용자 정의 인자
            const userArgs = args.slice(0, -1);

            const userOptions = await asyncOptions.useFactory(...userArgs);
            const resolvedOptions = TraceableLoggerModule.resolveOptions(userOptions);

            return {
              levels: CUSTOM_LEVELS.levels,
              level: resolvedOptions.level,
              transports: [
                new winston.transports.Console({
                  format: createWinstonFormat(cls, resolvedOptions),
                }),
              ],
            };
          },
        }),
      ],
      providers: [TraceableLogger],
      exports: [TraceableLogger],
    };
  }

  /**
   * 옵션 기본값 해결
   */
  private static resolveOptions(
    options: TraceableLoggerModuleOptions,
  ): Required<TraceableLoggerModuleOptions> {
    return {
      level: options.level ?? 'info',
      isLocal: options.isLocal ?? process.env.NODE_ENV !== 'production',
      appName: options.appName ?? 'Nest',
      traceIdLength: options.traceIdLength ?? 8,
      timestampFormat: options.timestampFormat ?? defaultTimestampFormat,
    };
  }
}
