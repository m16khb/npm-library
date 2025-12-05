import {Injectable, Inject, Optional} from '@nestjs/common';
import type {NestInterceptor, ExecutionContext, CallHandler} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import type {Observable} from 'rxjs';
import {from} from 'rxjs';

import {retry} from '../../core/retry/retry.js';
import {ASYNC_UTILS_MODULE_OPTIONS, RETRYABLE_OPTIONS} from '../constants.js';
import {LIBRARY_DEFAULTS} from '../defaults.js';
import type {AsyncUtilsModuleOptions} from '../interfaces/module-options.interface.js';
import type {RetryableOptions} from '../interfaces/retryable-options.interface.js';
import {AsyncUtilsLoggerService} from '../services/async-utils-logger.service.js';

/**
 * @Retryable 데코레이터를 위한 NestJS 인터셉터
 *
 * 메서드 실패 시 자동으로 재시도합니다.
 */
@Injectable()
export class RetryableInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(ASYNC_UTILS_MODULE_OPTIONS)
    private readonly moduleOptions?: AsyncUtilsModuleOptions,
    @Optional()
    private readonly loggerService?: AsyncUtilsLoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 메타데이터에서 옵션 가져오기
    const options = this.reflector.getAllAndOverride<RetryableOptions>(RETRYABLE_OPTIONS, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 옵션이 없으면 인터셉트하지 않음
    if (!options) {
      return next.handle();
    }

    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    // 옵션 병합: 데코레이터 > 모듈 > 기본값
    const retries =
      options.retries ?? this.moduleOptions?.defaultRetries ?? LIBRARY_DEFAULTS.retries;

    const enableLogging =
      options.enableLogging ?? this.moduleOptions?.enableLogging ?? LIBRARY_DEFAULTS.enableLogging;

    // 로깅 함수
    const logContext = `${className}.${methodName}`;
    const log = (message: string) => {
      if (!enableLogging) return;
      this.loggerService?.log(message, logContext);
    };

    // Observable을 Promise로 변환하여 retry 적용
    return from(
      retry(
        async () => {
          // Observable을 Promise로 변환하여 실행
          return new Promise((resolve, reject) => {
            next.handle().subscribe({
              next: value => resolve(value),
              error: err => reject(err),
            });
          });
        },
        {
          attempts: retries,
          strategy: options.strategy,
          retryIf: options.retryWhen
            ? options.retryWhen
            : options.retryOn
              ? error => options.retryOn!.some(ErrorClass => error instanceof ErrorClass)
              : undefined,
          onRetry: (attempt, error, delay) => {
            log(
              `Retry attempt ${attempt}/${retries} after error: ${error.message}. Next retry in ${delay}ms`,
            );
            options.onRetry?.(attempt, error, delay);
          },
        },
      ),
    );
  }
}
