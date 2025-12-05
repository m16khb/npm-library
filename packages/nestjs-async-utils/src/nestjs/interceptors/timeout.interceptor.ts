import {Injectable, Inject, Optional} from '@nestjs/common';
import type {NestInterceptor, ExecutionContext, CallHandler} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import type {Observable} from 'rxjs';
import {from} from 'rxjs';

import {pTimeout} from '../../core/timeout/timeout.js';
import {ASYNC_UTILS_MODULE_OPTIONS, TIMEOUT_OPTIONS} from '../constants.js';
import {LIBRARY_DEFAULTS} from '../defaults.js';
import type {AsyncUtilsModuleOptions} from '../interfaces/module-options.interface.js';
import type {
  TimeoutOptions,
  TimeoutOptionsOrMilliseconds,
} from '../interfaces/timeout-options.interface.js';
import {AsyncUtilsLoggerService} from '../services/async-utils-logger.service.js';

/**
 * @Timeout 데코레이터를 위한 NestJS 인터셉터
 *
 * 메서드 실행 시간을 제한합니다.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
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
    const rawOptions = this.reflector.getAllAndOverride<TimeoutOptionsOrMilliseconds>(
      TIMEOUT_OPTIONS,
      [context.getHandler(), context.getClass()],
    );

    // 옵션이 없으면 인터셉트하지 않음
    if (rawOptions === undefined) {
      return next.handle();
    }

    // 옵션 정규화 (number | TimeoutOptions -> TimeoutOptions)
    const options: TimeoutOptions =
      typeof rawOptions === 'number' ? {milliseconds: rawOptions} : rawOptions;

    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    // 옵션 병합: 데코레이터 > 모듈 > 기본값
    const timeout =
      options.milliseconds ?? this.moduleOptions?.defaultTimeout ?? LIBRARY_DEFAULTS.timeout;

    const enableLogging =
      options.enableLogging ?? this.moduleOptions?.enableLogging ?? LIBRARY_DEFAULTS.enableLogging;

    // 로깅 함수
    const logContext = `${className}.${methodName}`;
    const log = (message: string) => {
      if (!enableLogging) return;
      this.loggerService?.log(message, logContext);
    };

    // Observable을 Promise로 변환하여 pTimeout 적용
    return from(
      pTimeout(
        new Promise((resolve, reject) => {
          next.handle().subscribe({
            next: value => resolve(value),
            error: err => reject(err),
          });
        }),
        {
          milliseconds: timeout,
          onTimeout: () => {
            log(`Operation timed out after ${timeout}ms`);
            options.onTimeout?.(methodName, timeout);
          },
        },
      ),
    );
  }
}
