import {SetMetadata} from '@nestjs/common';
import {RETRY_OPTIONS_METADATA_KEY} from '../constants.js';
import type {RetryOptions} from '../interfaces/processor.interface.js';

/**
 * Job 재시도 정책을 설정합니다.
 *
 * @OnJob 데코레이터와 함께 사용하여 Job 실패 시 재시도 동작을 정의합니다.
 *
 * @param options - 재시도 옵션
 *
 * @example
 * ```typescript
 * @Processor('payment')
 * export class PaymentProcessor {
 *   // 고정 지연 재시도
 *   @OnJob('ProcessPaymentJob')
 *   @Retry({ maxAttempts: 3, delay: 1000 })
 *   async handlePayment(job: JobContext) {
 *     // 결제 처리 로직
 *   }
 *
 *   // 지수 백오프 재시도
 *   @OnJob('RefundJob')
 *   @Retry({ maxAttempts: 5, delay: 500, backoff: 'exponential' })
 *   async handleRefund(job: JobContext) {
 *     // 환불 처리 로직
 *   }
 * }
 * ```
 */
export function Retry(options: RetryOptions): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    SetMetadata(RETRY_OPTIONS_METADATA_KEY, options)(target, propertyKey, descriptor);
    return descriptor;
  };
}
