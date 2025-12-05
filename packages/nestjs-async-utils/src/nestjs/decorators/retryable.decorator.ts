import {applyDecorators, SetMetadata, UseInterceptors} from '@nestjs/common';

import {RETRYABLE_OPTIONS} from '../constants.js';
import {RetryableInterceptor} from '../interceptors/retryable.interceptor.js';
import type {RetryableOptions} from '../interfaces/retryable-options.interface.js';

/**
 * 메서드에 자동 재시도 기능을 추가하는 데코레이터
 *
 * @param options 재시도 옵션
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PaymentService {
 *   // 기본 옵션 사용 (3회 재시도)
 *   @Retryable()
 *   async processPayment(orderId: string): Promise<PaymentResult> {
 *     return this.paymentGateway.charge(orderId);
 *   }
 *
 *   // 커스텀 옵션
 *   @Retryable({
 *     retries: 5,
 *     strategy: exponentialBackoff(100, 5000),
 *     retryWhen: (error) => error.name !== 'ValidationError',
 *   })
 *   async fetchData(): Promise<Data> {
 *     return this.httpService.get('/api/data');
 *   }
 * }
 * ```
 */
export function Retryable(options: RetryableOptions = {}): MethodDecorator {
  return applyDecorators(
    SetMetadata(RETRYABLE_OPTIONS, options),
    UseInterceptors(RetryableInterceptor),
  );
}
