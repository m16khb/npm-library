import {applyDecorators, SetMetadata, UseInterceptors} from '@nestjs/common';

import {CONCURRENCY_LIMIT_OPTIONS} from '../constants.js';
import {ConcurrencyLimitInterceptor} from '../interceptors/concurrency-limit.interceptor.js';
import type {ConcurrencyLimitOptionsOrNumber} from '../interfaces/concurrency-options.interface.js';

/**
 * 메서드의 동시 실행 수를 제한하는 데코레이터
 *
 * @param options 동시성 제한 옵션 (숫자 또는 옵션 객체)
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ExternalApiService {
 *   // 간단한 사용 - 최대 5개 동시 실행
 *   @ConcurrencyLimit(5)
 *   async fetchData(id: string): Promise<Data> {
 *     return this.httpService.get(`/api/data/${id}`);
 *   }
 *
 *   // 상세 옵션 - 대기열 타임아웃 설정
 *   @ConcurrencyLimit({
 *     limit: 3,
 *     queueTimeout: 10000, // 10초 내에 슬롯 미확보 시 에러
 *     enableLogging: true,
 *   })
 *   async processRequest(req: Request): Promise<Response> {
 *     return this.processor.handle(req);
 *   }
 * }
 * ```
 */
export function ConcurrencyLimit(options: ConcurrencyLimitOptionsOrNumber): MethodDecorator {
  return applyDecorators(
    SetMetadata(CONCURRENCY_LIMIT_OPTIONS, options),
    UseInterceptors(ConcurrencyLimitInterceptor),
  );
}
