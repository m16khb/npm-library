import {Injectable, SetMetadata} from '@nestjs/common';
import {PROCESSOR_METADATA_KEY} from '../constants.js';
import type {ProcessorOptions, ProcessorMetadata} from '../interfaces/processor.interface.js';

/**
 * 클래스를 Sidequest Job Processor로 지정합니다.
 *
 * @Processor 데코레이터가 붙은 클래스는 모듈 초기화 시 자동으로 스캔되어
 * 해당 큐의 Job 핸들러로 등록됩니다.
 *
 * @param queueName - 처리할 큐 이름
 * @param options - 프로세서 옵션
 *
 * @example
 * ```typescript
 * @Processor('email')
 * export class EmailProcessor {
 *   @OnJob('send-welcome-email')
 *   async handleWelcomeEmail(job: JobContext) {
 *     const { to, subject, body } = job.data;
 *     await this.mailer.send({ to, subject, body });
 *   }
 * }
 *
 * // 동시성 설정과 함께
 * @Processor('report', { concurrency: 2 })
 * export class ReportProcessor {
 *   @OnJob('generate-daily-report')
 *   async handleDailyReport(job: JobContext) {
 *     // 리포트 생성 로직
 *   }
 * }
 * ```
 */
export function Processor(queueName: string, options?: ProcessorOptions): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function): void => {
    const metadata: ProcessorMetadata = {
      queueName,
      options,
    };

    // 메타데이터 설정
    SetMetadata(PROCESSOR_METADATA_KEY, metadata)(target);

    // @Injectable() 자동 적용
    Injectable()(target);
  };
}
