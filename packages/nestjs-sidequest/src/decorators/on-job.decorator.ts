import {SetMetadata} from '@nestjs/common';
import {ON_JOB_METADATA_KEY} from '../constants.js';
import type {OnJobOptions, OnJobMetadata} from '../interfaces/processor.interface.js';

/**
 * 메서드를 특정 Job 타입의 핸들러로 지정합니다.
 *
 * @Processor 데코레이터가 붙은 클래스 내부에서 사용합니다.
 * 해당 Job이 큐에서 처리될 때 이 메서드가 호출됩니다.
 *
 * @param jobName - Job 이름 (일반적으로 Job 클래스명)
 * @param options - Job 실행 옵션 (우선순위, 타임아웃 등)
 *
 * @example
 * ```typescript
 * @Processor('email')
 * export class EmailProcessor {
 *   @OnJob('SendWelcomeEmailJob')
 *   async handleWelcomeEmail(job: JobContext) {
 *     const { to, subject, body } = job.data;
 *     await this.mailer.send({ to, subject, body });
 *   }
 *
 *   // 우선순위와 타임아웃 설정
 *   @OnJob('SendPriorityEmailJob', { priority: 100, timeout: 5000 })
 *   async handlePriorityEmail(job: JobContext) {
 *     // 우선순위가 높은 이메일 처리
 *   }
 * }
 * ```
 */
export function OnJob(jobName: string, options?: OnJobOptions): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const metadata: OnJobMetadata = {
      jobName,
      options,
    };

    SetMetadata(ON_JOB_METADATA_KEY, metadata)(target, propertyKey, descriptor);

    return descriptor;
  };
}
