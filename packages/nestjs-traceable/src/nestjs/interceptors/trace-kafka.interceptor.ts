import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { TRACE_ID_KEY } from '../services/trace-context.service';

/**
 * Kafka 메시지 헤더 인터페이스 (타입 호환용)
 */
interface KafkaHeaders {
  [key: string]: Buffer | string | undefined;
}

/**
 * Kafka 메시지 인터페이스 (타입 호환용)
 */
interface KafkaMessage {
  headers?: KafkaHeaders;
  key?: Buffer | string | null;
  value: Buffer | string | null;
  timestamp?: string;
  offset?: string;
}

/**
 * Kafka Context 인터페이스 (타입 호환용)
 */
interface KafkaContext {
  getMessage(): KafkaMessage;
  getTopic(): string;
  getPartition(): number;
  getConsumer?(): unknown;
  getHeartbeat?(): () => Promise<void>;
}

/**
 * Kafka 메시지에서 traceId를 추출하여 CLS 컨텍스트에 설정하는 인터셉터
 *
 * Kafka 메시지 헤더에서 traceId를 읽어 CLS에 설정합니다.
 * traceId가 없으면 새로 생성합니다.
 *
 * @example
 * ```typescript
 * // main.ts (Kafka 마이크로서비스)
 * const app = await NestFactory.createMicroservice<MicroserviceOptions>(
 *   AppModule,
 *   {
 *     transport: Transport.KAFKA,
 *     options: { client: { brokers: ['localhost:9092'] } }
 *   }
 * );
 *
 * // app.module.ts
 * @Module({
 *   imports: [TraceModule.forRoot()],
 *   providers: [
 *     { provide: APP_INTERCEPTOR, useClass: TraceKafkaInterceptor },
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // Producer에서 traceId 전달
 * await this.kafkaClient.emit('topic', {
 *   key: 'key',
 *   value: JSON.stringify(data),
 *   headers: { 'x-trace-id': traceId },
 * });
 * ```
 */
@Injectable()
export class TraceKafkaInterceptor implements NestInterceptor {
  private readonly headerName: string;

  constructor(
    private readonly cls: ClsService,
    headerName?: string,
  ) {
    this.headerName = headerName ?? 'x-trace-id';
  }

  /**
   * Kafka 메시지를 인터셉트하여 traceId를 CLS 컨텍스트에 설정
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // RPC 컨텍스트가 아니면 그냥 통과
    if (context.getType() !== 'rpc') {
      return next.handle();
    }

    const kafkaContext = this.getKafkaContext(context);
    const traceId = this.extractTraceId(kafkaContext);

    // CLS 컨텍스트에서 실행
    return new Observable((subscriber) => {
      this.cls.run(() => {
        this.cls.set(TRACE_ID_KEY, traceId);

        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }

  /**
   * ExecutionContext에서 KafkaContext 추출
   */
  private getKafkaContext(context: ExecutionContext): KafkaContext | undefined {
    try {
      const rpcContext = context.switchToRpc().getContext();

      // NestJS Kafka Context 구조 확인
      if (rpcContext && typeof rpcContext.getMessage === 'function') {
        return rpcContext as KafkaContext;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Kafka 메시지 헤더에서 traceId 추출
   */
  private extractTraceId(kafkaContext: KafkaContext | undefined): string {
    if (!kafkaContext) {
      return randomUUID();
    }

    try {
      const message = kafkaContext.getMessage();
      const headers = message.headers;

      if (headers) {
        const traceIdValue = headers[this.headerName];
        if (traceIdValue) {
          return Buffer.isBuffer(traceIdValue) ? traceIdValue.toString() : traceIdValue;
        }
      }
    } catch {
      // 헤더 접근 실패
    }

    return randomUUID();
  }
}

/**
 * Kafka Producer에서 traceId를 메시지 헤더에 주입하는 유틸리티
 *
 * @example
 * ```typescript
 * // Kafka Producer 서비스에서 사용
 * @Injectable()
 * export class MyKafkaProducer {
 *   constructor(
 *     @Inject('KAFKA_SERVICE') private readonly kafka: ClientKafka,
 *     private readonly cls: ClsService,
 *   ) {}
 *
 *   async emit(topic: string, data: any) {
 *     const headers = createKafkaTraceHeaders(this.cls);
 *     await this.kafka.emit(topic, {
 *       value: JSON.stringify(data),
 *       headers,
 *     });
 *   }
 * }
 * ```
 */
export function createKafkaTraceHeaders(
  cls: ClsService,
  headerName = 'x-trace-id',
): KafkaHeaders {
  let traceId: string;

  try {
    if (cls.isActive()) {
      traceId = cls.get<string>(TRACE_ID_KEY) ?? randomUUID();
    } else {
      traceId = randomUUID();
    }
  } catch {
    traceId = randomUUID();
  }

  return { [headerName]: traceId };
}
