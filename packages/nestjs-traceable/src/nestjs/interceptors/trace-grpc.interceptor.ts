import {Injectable, NestInterceptor, ExecutionContext, CallHandler} from '@nestjs/common';
import {ClsService} from 'nestjs-cls';
import {Observable} from 'rxjs';
import {randomUUID} from 'crypto';
import {TRACE_ID_KEY} from '../services/trace-context.service';

/**
 * gRPC Metadata 인터페이스 (타입 호환용)
 * @grpc/grpc-js 직접 의존 대신 최소 인터페이스 정의
 */
interface GrpcMetadata {
  get(key: string): (string | Buffer)[];
  set(key: string, value: string): void;
}

/**
 * gRPC 요청에서 traceId를 추출하여 CLS 컨텍스트에 설정하는 인터셉터
 *
 * gRPC Metadata에서 traceId를 읽어 CLS에 설정합니다.
 * traceId가 없으면 새로 생성합니다.
 *
 * @example
 * ```typescript
 * // main.ts (gRPC 마이크로서비스)
 * const app = await NestFactory.createMicroservice<MicroserviceOptions>(
 *   AppModule,
 *   { transport: Transport.GRPC, ... }
 * );
 *
 * // app.module.ts
 * @Module({
 *   imports: [TraceModule.forRoot()],
 *   providers: [
 *     { provide: APP_INTERCEPTOR, useClass: TraceGrpcInterceptor },
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // 클라이언트에서 traceId 전달
 * const metadata = new Metadata();
 * metadata.set('x-trace-id', 'my-trace-id');
 * client.myMethod(request, metadata);
 * ```
 */
@Injectable()
export class TraceGrpcInterceptor implements NestInterceptor {
  private readonly headerName: string;

  constructor(
    private readonly cls: ClsService,
    headerName?: string,
  ) {
    this.headerName = headerName ?? 'x-trace-id';
  }

  /**
   * gRPC 요청을 인터셉트하여 traceId를 CLS 컨텍스트에 설정
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // gRPC 컨텍스트가 아니면 그냥 통과
    if (context.getType() !== 'rpc') {
      return next.handle();
    }

    const metadata = this.getMetadata(context);
    const traceId = this.extractTraceId(metadata);

    // CLS 컨텍스트에서 실행
    return new Observable(subscriber => {
      this.cls.run(() => {
        this.cls.set(TRACE_ID_KEY, traceId);

        // 응답 메타데이터에도 traceId 설정 (양방향 추적)
        if (metadata) {
          this.setResponseTraceId(metadata, traceId);
        }

        next.handle().subscribe({
          next: value => subscriber.next(value),
          error: err => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }

  /**
   * ExecutionContext에서 gRPC Metadata 추출
   */
  private getMetadata(context: ExecutionContext): GrpcMetadata | undefined {
    try {
      const rpcContext = context.switchToRpc().getContext();

      // NestJS gRPC 컨텍스트 구조
      if (rpcContext && typeof rpcContext.get === 'function') {
        return rpcContext as GrpcMetadata;
      }

      // 일부 gRPC 설정에서는 다른 구조일 수 있음
      if (rpcContext?.metadata && typeof rpcContext.metadata.get === 'function') {
        return rpcContext.metadata as GrpcMetadata;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Metadata에서 traceId 추출
   */
  private extractTraceId(metadata: GrpcMetadata | undefined): string {
    if (!metadata) {
      return randomUUID();
    }

    try {
      const values = metadata.get(this.headerName);
      if (values && values.length > 0) {
        const value = values[0];
        if (value !== undefined) {
          return typeof value === 'string' ? value : value.toString();
        }
      }
    } catch {
      // 메타데이터 접근 실패
    }

    return randomUUID();
  }

  /**
   * 응답 메타데이터에 traceId 설정
   */
  private setResponseTraceId(metadata: GrpcMetadata, traceId: string): void {
    try {
      metadata.set(this.headerName, traceId);
    } catch {
      // 일부 구현에서는 응답 메타데이터 설정 불가
    }
  }
}
