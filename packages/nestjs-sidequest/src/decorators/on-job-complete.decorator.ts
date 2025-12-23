import {SetMetadata} from '@nestjs/common';
import {ON_JOB_COMPLETE_METADATA_KEY} from '../constants.js';

/**
 * Job 완료 이벤트 핸들러를 지정합니다.
 *
 * @Processor 클래스 내부에서 사용하며, Job이 성공적으로 완료되면 호출됩니다.
 *
 * @param jobName - 대상 Job 이름 (생략 시 모든 Job에 대해 호출)
 *
 * @example
 * ```typescript
 * @Processor('email')
 * export class EmailProcessor {
 *   @OnJob('SendWelcomeEmailJob')
 *   async handleWelcomeEmail(job: JobContext) {
 *     await this.mailer.send(job.data);
 *   }
 *
 *   // 특정 Job 완료 이벤트
 *   @OnJobComplete('SendWelcomeEmailJob')
 *   async onWelcomeEmailComplete(event: JobCompleteEvent) {
 *     this.logger.log(`환영 이메일 발송 완료: ${event.result}`);
 *     await this.analytics.track('email_sent', { type: 'welcome' });
 *   }
 *
 *   // 모든 Job 완료 이벤트 (jobName 생략)
 *   @OnJobComplete()
 *   async onAnyJobComplete(event: JobCompleteEvent) {
 *     this.logger.log(`Job 완료: ${event.jobName}`);
 *   }
 * }
 * ```
 */
export function OnJobComplete(jobName?: string): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    // jobName이 undefined면 빈 문자열로 저장 (모든 Job에 대해 호출)
    SetMetadata(ON_JOB_COMPLETE_METADATA_KEY, jobName ?? '')(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * Job 완료 이벤트 데이터
 */
export interface JobCompleteEvent {
  /** Job 이름 */
  jobName: string;

  /** Job 실행 인자 */
  args: unknown[];

  /** Job 실행 결과 */
  result: unknown;
}
