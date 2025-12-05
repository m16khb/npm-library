import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import {
  TRACE_METADATA_KEY,
  TRACEABLE_METADATA_KEY,
} from '../constants';
import { TraceContextService } from '../services/trace-context.service';

/**
 * 메서드 실행 추적 인터셉터
 * @Trace 데코레이터와 함께 사용되어 실행 시간을 로깅한다.
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceInterceptor.name);

  constructor(
    private readonly traceService: TraceContextService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * 메서드 실행 전후를 가로채서 실행 시간을 로깅한다.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 컨텍스트가 없으면 그냥 실행
    if (!this.traceService.hasContext()) {
      return next.handle();
    }

    // 작업명 가져오기
    const operationName = this.getOperationName(context);
    const traceId = this.traceService.getTraceId();

    // 실행 시간 측정
    const startTime = Date.now();

    this.logger.debug(`[${traceId}] ${operationName} started`);

    // 메서드 실행
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.debug(`[${traceId}] ${operationName} completed (${duration}ms)`);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.warn(`[${traceId}] ${operationName} failed (${duration}ms): ${error.message}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * 작업명을 가져온다.
   */
  private getOperationName(context: ExecutionContext): string {
    // 메서드의 @Trace 메타데이터 확인
    const operationName = this.reflector.get<string>(
      TRACE_METADATA_KEY,
      context.getHandler(),
    );

    if (operationName) {
      return operationName;
    }

    // @Traceable 클래스인지 확인
    const isTraceable = this.reflector.get<boolean>(
      TRACEABLE_METADATA_KEY,
      context.getClass(),
    );

    if (isTraceable) {
      return context.getHandler().name || 'unknown';
    }

    return 'unknown-operation';
  }
}
