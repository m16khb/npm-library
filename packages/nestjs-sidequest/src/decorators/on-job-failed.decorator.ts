import {SetMetadata} from '@nestjs/common';
import {ON_JOB_FAILED_METADATA_KEY} from '../constants.js';

/**
 * Job 실패 이벤트 핸들러를 지정합니다.
 *
 * @Processor 클래스 내부에서 사용하며, Job 실행이 실패하면 호출됩니다.
 * 재시도 횟수를 모두 소진한 후 최종 실패 시에만 호출됩니다.
 *
 * @param jobName - 대상 Job 이름 (생략 시 모든 Job에 대해 호출)
 *
 * @example
 * ```typescript
 * @Processor('payment')
 * export class PaymentProcessor {
 *   @OnJob('ProcessPaymentJob')
 *   @Retry({ maxAttempts: 3 })
 *   async handlePayment(job: JobContext) {
 *     await this.paymentService.process(job.data);
 *   }
 *
 *   // 특정 Job 실패 이벤트
 *   @OnJobFailed('ProcessPaymentJob')
 *   async onPaymentFailed(event: JobFailedEvent) {
 *     this.logger.error(`결제 처리 실패: ${event.error.message}`);
 *     await this.alertService.notify('payment-failure', {
 *       orderId: event.args[0],
 *       error: event.error.message,
 *     });
 *   }
 *
 *   // 모든 Job 실패 이벤트 (jobName 생략)
 *   @OnJobFailed()
 *   async onAnyJobFailed(event: JobFailedEvent) {
 *     this.logger.error(`Job 실패: ${event.jobName}`, event.error);
 *   }
 * }
 * ```
 */
export function OnJobFailed(jobName?: string): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    // jobName이 undefined면 빈 문자열로 저장 (모든 Job에 대해 호출)
    SetMetadata(ON_JOB_FAILED_METADATA_KEY, jobName ?? '')(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * Job 실패 이벤트 데이터
 */
export interface JobFailedEvent {
  /** Job 이름 */
  jobName: string;

  /** Job 실행 인자 */
  args: unknown[];

  /** 발생한 에러 */
  error: Error;
}
