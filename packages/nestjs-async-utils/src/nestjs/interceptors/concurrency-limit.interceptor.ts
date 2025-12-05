import {Injectable, Inject, Optional} from '@nestjs/common';
import type {NestInterceptor, ExecutionContext, CallHandler} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import type {Observable} from 'rxjs';
import {from} from 'rxjs';

import {ASYNC_UTILS_MODULE_OPTIONS, CONCURRENCY_LIMIT_OPTIONS} from '../constants.js';
import {LIBRARY_DEFAULTS} from '../defaults.js';
import {QueueTimeoutError} from '../errors/queue-timeout-error.js';
import type {AsyncUtilsModuleOptions} from '../interfaces/module-options.interface.js';
import type {
  ConcurrencyLimitOptions,
  ConcurrencyLimitOptionsOrNumber,
} from '../interfaces/concurrency-options.interface.js';
import {ConcurrencyManagerService} from '../services/concurrency-manager.service.js';
import {AsyncUtilsLoggerService} from '../services/async-utils-logger.service.js';

/**
 * @ConcurrencyLimit 데코레이터를 위한 NestJS 인터셉터
 *
 * 동일 메서드의 동시 실행 수를 제한합니다.
 */
@Injectable()
export class ConcurrencyLimitInterceptor implements NestInterceptor {
  // ConcurrencyManagerService가 주입되지 않은 경우를 위한 로컬 인스턴스
  private readonly localManager: ConcurrencyManagerService;

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(ASYNC_UTILS_MODULE_OPTIONS)
    private readonly moduleOptions?: AsyncUtilsModuleOptions,
    @Optional()
    private readonly concurrencyManager?: ConcurrencyManagerService,
    @Optional()
    private readonly loggerService?: AsyncUtilsLoggerService,
  ) {
    // ConcurrencyManagerService가 주입되지 않으면 로컬 인스턴스 사용
    this.localManager = new ConcurrencyManagerService();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 메타데이터에서 옵션 가져오기
    const rawOptions = this.reflector.getAllAndOverride<ConcurrencyLimitOptionsOrNumber>(
      CONCURRENCY_LIMIT_OPTIONS,
      [context.getHandler(), context.getClass()],
    );

    // 옵션이 없으면 인터셉트하지 않음
    if (rawOptions === undefined) {
      return next.handle();
    }

    // 옵션 정규화 (number | ConcurrencyLimitOptions -> ConcurrencyLimitOptions)
    const options: ConcurrencyLimitOptions =
      typeof rawOptions === 'number' ? {limit: rawOptions} : rawOptions;

    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    // 옵션 병합: 데코레이터 > 모듈 > 기본값
    const limit =
      options.limit ?? this.moduleOptions?.defaultConcurrency ?? LIBRARY_DEFAULTS.concurrency;

    const enableLogging =
      options.enableLogging ?? this.moduleOptions?.enableLogging ?? LIBRARY_DEFAULTS.enableLogging;

    // 사용할 manager 결정
    const manager = this.concurrencyManager ?? this.localManager;

    // limiter 가져오기
    const limiter = manager.getLimiter(className, methodName, limit);

    // 로깅 함수
    const logContext = `${className}.${methodName}`;
    const log = (message: string) => {
      if (!enableLogging) return;
      this.loggerService?.log(message, logContext);
    };

    // 대기열 타임아웃이 있는 경우 처리
    const queueTimeout = options.queueTimeout;

    // limiter를 통해 실행
    return from(
      (async () => {
        const startQueueTime = Date.now();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let queueTimedOut = false;

        // 대기열 타임아웃 설정
        const timeoutPromise = queueTimeout
          ? new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                queueTimedOut = true;
                reject(new QueueTimeoutError(`${className}.${methodName}`, queueTimeout));
              }, queueTimeout);
            })
          : null;

        try {
          log(
            `Waiting for concurrency slot (active: ${limiter.activeCount}, pending: ${limiter.pendingCount})`,
          );

          // limiter를 통해 실행
          const executePromise = limiter(async () => {
            // 대기열에서 나왔을 때 이미 타임아웃이 발생했으면 실행하지 않음
            if (queueTimedOut) {
              throw new QueueTimeoutError(`${className}.${methodName}`, queueTimeout!);
            }

            // 타임아웃 타이머 클리어
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
            }

            const queueWaitTime = Date.now() - startQueueTime;
            if (queueWaitTime > 0) {
              log(`Got concurrency slot after ${queueWaitTime}ms wait`);
            }

            // Observable을 Promise로 변환하여 실행
            return new Promise((resolve, reject) => {
              next.handle().subscribe({
                next: value => resolve(value),
                error: err => reject(err),
              });
            });
          });

          // 대기열 타임아웃이 있으면 경쟁
          if (timeoutPromise) {
            return await Promise.race([executePromise, timeoutPromise]);
          }

          return await executePromise;
        } finally {
          // 타임아웃 타이머 클리어 (아직 남아있으면)
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      })(),
    );
  }
}
