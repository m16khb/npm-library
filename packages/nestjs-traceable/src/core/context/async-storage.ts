import { AsyncLocalStorage } from 'node:async_hooks';
import type { ITraceContext } from '../interfaces';

/**
 * AsyncLocalStorage 래퍼
 * NestJS 애플리케이션에서 추적 컨텍스트를 관리한다.
 */
export class AsyncLocalStorageManager {
  private readonly storage = new AsyncLocalStorage<ITraceContext>();

  /**
   * 현재 컨텍스트를 가져온다.
   * @returns 현재 컨텍스트 또는 undefined
   */
  getCurrent(): ITraceContext | undefined {
    return this.storage.getStore();
  }

  /**
   * 동기 함수를 주어진 컨텍스트에서 실행한다.
   * @param context 실행할 컨텍스트
   * @param fn 실행할 함수
   * @returns 함수 실행 결과
   */
  run<T>(context: ITraceContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * 비동기 함수를 주어진 컨텍스트에서 실행한다.
   * @param context 실행할 컨텍스트
   * @param fn 실행할 비동기 함수
   * @returns Promise<T>
   */
  runAsync<T>(context: ITraceContext, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(context, fn);
  }

  /**
   * 컨텍스트가 없을 경우 기본 컨텍스트를 생성하여 실행한다.
   * @param fn 실행할 함수
   * @returns 함수 실행 결과
   */
  runWithDefault<T>(fn: (context: ITraceContext) => T): T {
    const current = this.getCurrent();
    if (current) {
      return fn(current);
    }

    const defaultContext: ITraceContext = {
      traceId: 'unknown',
      spanId: '00000000',
      startTime: Date.now(),
    };

    return this.run(defaultContext, () => fn(defaultContext));
  }

  /**
   * 컨텍스트를 업데이트한다. (불변성 유지)
   * @param updates 업데이트할 필드
   * @returns 업데이트된 컨텍스트
   */
  updateContext(updates: Partial<ITraceContext>): ITraceContext | undefined {
    const current = this.getCurrent();
    if (!current) {
      return undefined;
    }

    const updated: ITraceContext = {
      ...current,
      ...updates,
    };

    // 현재 스토리지는 직접 업데이트할 수 없으므로,
    // 업데이트된 컨텍스트를 반환한다.
    // 실제 업데이트는 run() 또는 runAsync()를 통해 이루어진다.
    return updated;
  }
}