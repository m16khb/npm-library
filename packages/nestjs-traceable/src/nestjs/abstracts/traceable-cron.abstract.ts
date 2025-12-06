import {TraceContextService} from '../services/trace-context.service';

/**
 * TraceableCronService - CLS 트레이스 컨텍스트를 자동으로 설정하는 크론 서비스 추상 클래스
 *
 * 모든 크론 서비스는 이 클래스를 상속받아 traceId 관리 코드 중복을 제거합니다.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ReportCronService extends TraceableCronService {
 *   constructor(
 *     traceContext: TraceContextService,
 *     private readonly reportService: ReportService,
 *     private readonly logger: TraceableLogger,
 *   ) {
 *     super(traceContext);
 *   }
 *
 *   @Cron('0 0 * * *', { name: 'daily-report', timeZone: 'Asia/Seoul' })
 *   async generateDailyReport(): Promise<void> {
 *     await this.runWithTrace(async () => {
 *       this.logger.log('[크론] 일일 리포트 생성 시작');
 *       await this.reportService.generate();
 *     });
 *   }
 * }
 * ```
 *
 * @benefits
 * - TraceContextService 주입이 필수이므로 런타임 에러 방지
 * - 상속을 통한 일관된 크론 서비스 구조
 * - 크론 → 큐 → 프로세서 간 traceId 전파 보장
 * - IDE 자동완성 및 타입 체크 지원
 */
export abstract class TraceableCronService {
  /**
   * @param traceContext - TraceContextService 인스턴스 (필수)
   * @throws Error - TraceContextService가 제공되지 않은 경우
   */
  constructor(protected readonly traceContext: TraceContextService) {
    if (!traceContext) {
      throw new Error(
        `TraceableCronService requires TraceContextService to be injected. ` +
          `Make sure to pass TraceContextService to super() in your constructor.`,
      );
    }
  }

  /**
   * 새로운 CLS 컨텍스트에서 함수를 실행합니다.
   * traceId가 자동으로 생성되어 설정됩니다.
   *
   * @param fn - 실행할 비동기 함수
   * @param traceId - 사용할 traceId (선택적, 미제공 시 자동 생성)
   *
   * @example
   * ```typescript
   * @Cron('0 * * * *')
   * async myJob(): Promise<void> {
   *   await this.runWithTrace(async () => {
   *     const traceId = this.getTraceId();
   *     this.logger.log('Job 실행', { traceId });
   *     await this.service.process();
   *   });
   * }
   * ```
   */
  protected async runWithTrace<T>(fn: () => Promise<T>, traceId?: string): Promise<T> {
    return this.traceContext.runAsync(fn, traceId);
  }

  /**
   * 현재 트레이스 ID 조회
   * @returns 현재 CLS 컨텍스트의 traceId (없으면 undefined)
   */
  protected getTraceId(): string | undefined {
    return this.traceContext.getTraceId();
  }

  /**
   * 사용자 정의 값을 CLS에 저장합니다.
   */
  protected set<T>(key: string, value: T): void {
    this.traceContext.set(key, value);
  }

  /**
   * 사용자 정의 값을 CLS에서 조회합니다.
   */
  protected get<T>(key: string): T | undefined {
    return this.traceContext.get<T>(key);
  }
}
