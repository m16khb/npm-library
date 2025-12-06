import {Cron, CronOptions} from '@nestjs/schedule';
import {TraceContextService} from '../services/trace-context.service';

/**
 * TraceContextService를 가진 클래스 인터페이스
 */
interface HasTraceContext {
  traceContext: TraceContextService;
}

/**
 * @TracedCron - CLS 트레이스 컨텍스트를 자동으로 설정하는 Cron 데코레이터
 *
 * @Cron 데코레이터와 동일한 시그니처를 가지며, 메서드 실행 시 자동으로
 * TraceContextService.runAsync()로 래핑하여 traceId를 생성/설정합니다.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class CleanupCronService {
 *   constructor(
 *     private readonly traceContext: TraceContextService,
 *     private readonly logger: TraceableLogger,
 *   ) {}
 *
 *   @TracedCron('0 6 * * *', {
 *     name: 'cleanup-expired-files',
 *     timeZone: 'Asia/Seoul',
 *   })
 *   async cleanupExpiredFiles(): Promise<void> {
 *     // traceId가 자동으로 설정됨!
 *     this.logger.log('만료된 파일 정리 시작');
 *     await this.cleanupService.cleanup();
 *   }
 * }
 * ```
 *
 * @param cronTime - Cron 표현식 (예: '0 6 * * *')
 * @param options - @nestjs/schedule의 CronOptions
 *
 * @requires 클래스에 `traceContext: TraceContextService` 프로퍼티가 있어야 합니다.
 */
export function TracedCron(cronTime: string | Date, options?: CronOptions): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalMethod = descriptor.value as (...args: any[]) => Promise<any>;

    // 원본 메서드를 래핑
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (this: HasTraceContext, ...args: any[]): Promise<any> {
      // traceContext가 있는지 확인
      if (!this.traceContext || typeof this.traceContext.runAsync !== 'function') {
        throw new Error(
          `@TracedCron requires 'traceContext: TraceContextService' property in the class. ` +
            `Make sure to inject TraceContextService in your constructor.`,
        );
      }

      // TraceContextService.runAsync로 래핑하여 실행
      return this.traceContext.runAsync(() => originalMethod.apply(this, args));
    };

    // @Cron 데코레이터 적용
    Cron(cronTime, options)(target, propertyKey, descriptor);

    return descriptor;
  };
}
