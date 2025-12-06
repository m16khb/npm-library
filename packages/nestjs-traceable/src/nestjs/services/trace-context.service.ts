import {Injectable} from '@nestjs/common';
import {ClsService} from 'nestjs-cls';
import {randomUUID} from 'crypto';

/**
 * traceId 저장 키
 */
export const TRACE_ID_KEY = 'traceId';

/**
 * 추적 컨텍스트 서비스
 *
 * nestjs-cls의 ClsService를 사용하여 traceId를 관리한다.
 * spanId 관리는 otel에 위임.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly traceContext: TraceContextService) {}
 *
 *   doSomething() {
 *     const traceId = this.traceContext.getTraceId();
 *     // traceId를 사용하여 로깅 또는 외부 시스템 연동
 *   }
 * }
 * ```
 */
@Injectable()
export class TraceContextService {
  constructor(private readonly cls: ClsService) {}

  /**
   * 현재 trace ID를 가져온다.
   */
  getTraceId(): string | undefined {
    try {
      if (!this.cls.isActive()) {
        return undefined;
      }
      return this.cls.get<string>(TRACE_ID_KEY);
    } catch {
      return undefined;
    }
  }

  /**
   * trace ID를 설정한다.
   */
  setTraceId(traceId: string): void {
    if (this.cls.isActive()) {
      this.cls.set(TRACE_ID_KEY, traceId);
    }
  }

  /**
   * 새로운 trace ID를 생성하고 설정한다.
   */
  generateTraceId(): string {
    const traceId = randomUUID();
    this.setTraceId(traceId);
    return traceId;
  }

  /**
   * 추적 컨텍스트가 있는지 확인한다.
   */
  hasContext(): boolean {
    try {
      return this.cls.isActive() && this.getTraceId() !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * CLS가 활성화되어 있는지 확인한다.
   */
  isActive(): boolean {
    return this.cls.isActive();
  }

  /**
   * 새로운 컨텍스트에서 함수를 실행한다.
   * traceId가 제공되지 않으면 새로 생성한다.
   */
  run<T>(fn: () => T, traceId?: string): T {
    return this.cls.run(() => {
      this.setTraceId(traceId ?? randomUUID());
      return fn();
    });
  }

  /**
   * 새로운 컨텍스트에서 비동기 함수를 실행한다.
   * traceId가 제공되지 않으면 새로 생성한다.
   */
  async runAsync<T>(fn: () => Promise<T>, traceId?: string): Promise<T> {
    return this.cls.run(async () => {
      this.setTraceId(traceId ?? randomUUID());
      return fn();
    });
  }

  /**
   * 주어진 trace ID가 현재 trace와 일치하는지 확인한다.
   */
  isSameTrace(traceId: string): boolean {
    try {
      return this.getTraceId() === traceId;
    } catch {
      return false;
    }
  }

  /**
   * ClsService 인스턴스를 가져온다.
   * 직접 CLS 기능을 사용해야 할 때 사용.
   */
  getClsService(): ClsService {
    return this.cls;
  }

  /**
   * 사용자 정의 값을 CLS에 저장한다.
   *
   * @example
   * ```typescript
   * this.traceContext.set('userId', '12345');
   * this.traceContext.set('requestId', req.id);
   * ```
   */
  set<T = any>(key: string, value: T): void {
    if (this.cls.isActive()) {
      this.cls.set(key, value);
    }
  }

  /**
   * 사용자 정의 값을 CLS에서 조회한다.
   *
   * @example
   * ```typescript
   * const userId = this.traceContext.get<string>('userId');
   * const requestId = this.traceContext.get<string>('requestId');
   * ```
   */
  get<T = any>(key: string): T | undefined {
    try {
      if (!this.cls.isActive()) {
        return undefined;
      }
      return this.cls.get<T>(key) as T | undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 특정 키가 CLS에 존재하는지 확인한다.
   *
   * @example
   * ```typescript
   * if (this.traceContext.has('userId')) {
   *   const userId = this.traceContext.get<string>('userId');
   * }
   * ```
   */
  has(key: string): boolean {
    try {
      return this.cls.isActive() && this.cls.get(key) !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * CLS에서 특정 키를 삭제한다.
   *
   * @example
   * ```typescript
   * this.traceContext.delete('temporaryData');
   * ```
   */
  delete(key: string): void {
    if (this.cls.isActive()) {
      this.cls.set(key, undefined);
    }
  }
}
