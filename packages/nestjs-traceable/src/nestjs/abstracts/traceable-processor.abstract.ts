import { WorkerHost } from '@nestjs/bullmq';
import { ClsService } from 'nestjs-cls';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { TRACE_ID_KEY } from '../services/trace-context.service';

/**
 * traceId를 포함할 수 있는 Job 데이터 인터페이스
 */
export interface TraceableJobData {
  /** 트레이스 ID (크론/큐에서 전달, 없으면 프로세서에서 생성) */
  traceId?: string;
}

/**
 * TraceableProcessor - CLS 트레이스 컨텍스트를 자동으로 설정하는 BullMQ 프로세서 추상 클래스
 *
 * WorkerHost를 상속받아 process() 메서드에서 자동으로 CLS 컨텍스트를 설정합니다.
 * 서브클래스는 executeJob() 추상 메서드만 구현하면 됩니다.
 *
 * @example
 * ```typescript
 * @Processor('payment', { concurrency: 3 })
 * export class PaymentProcessor extends TraceableProcessor<PaymentJobData, PaymentResult> {
 *   constructor(
 *     cls: ClsService,
 *     private readonly paymentService: PaymentService,
 *     private readonly logger: TraceableLogger,
 *   ) {
 *     super(cls);
 *   }
 *
 *   protected async executeJob(job: Job<PaymentJobData>): Promise<PaymentResult> {
 *     // traceId가 이미 CLS에 설정됨!
 *     this.logger.log(`결제 처리: ${job.data.orderId}`);
 *     return this.paymentService.process(job.data);
 *   }
 * }
 * ```
 *
 * @benefits
 * - traceId 설정 코드 중복 제거
 * - 크론 → 프로세서 간 로그 연속성 자동 보장
 * - executeJob() 추상 메서드로 구현 강제
 * - TResult 타입으로 반환값 타입 안전성
 *
 * @typeParam TData - Job 데이터 타입 (TraceableJobData 확장)
 * @typeParam TResult - Job 처리 결과 타입 (기본: void)
 */
export abstract class TraceableProcessor<
  TData extends TraceableJobData,
  TResult = void,
> extends WorkerHost {
  constructor(protected readonly cls: ClsService) {
    super();
  }

  /**
   * BullMQ의 process 메서드 구현
   *
   * CLS 컨텍스트를 생성하고 traceId를 설정한 후 executeJob을 호출합니다.
   * 크론에서 전달받은 traceId가 있으면 사용하고, 없으면 새로 생성합니다.
   *
   * @param job - BullMQ Job 객체
   * @returns Job 처리 결과
   */
  async process(job: Job<TData>): Promise<TResult> {
    return this.cls.run(async () => {
      // 크론/큐에서 전달받은 traceId 사용, 없으면 새로 생성
      this.cls.set(TRACE_ID_KEY, job.data.traceId ?? randomUUID());
      return this.executeJob(job);
    });
  }

  /**
   * 서브클래스에서 구현해야 하는 실제 작업 처리 로직
   *
   * CLS 컨텍스트가 이미 설정된 상태로 호출됩니다.
   * traceId는 this.getTraceId()로 접근 가능합니다.
   *
   * @param job - BullMQ Job 객체
   * @returns Job 처리 결과
   */
  protected abstract executeJob(job: Job<TData>): Promise<TResult>;

  /**
   * 현재 traceId 조회 유틸리티
   * @returns 현재 CLS 컨텍스트의 traceId (없으면 undefined)
   */
  protected getTraceId(): string | undefined {
    try {
      return this.cls.isActive() ? this.cls.get<string>(TRACE_ID_KEY) : undefined;
    } catch {
      return undefined;
    }
  }
}
