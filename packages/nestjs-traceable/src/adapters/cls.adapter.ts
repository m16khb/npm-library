import type { ITraceContext, ITraceContextManager } from '../core/interfaces';

/**
 * CLS (Continuation Local Storage) 어댑터 인터페이스
 */
export interface IClsAdapter {
  /**
   * 현재 컨텍스트를 가져온다
   */
  getCurrent(): ITraceContext | undefined;

  /**
   * 컨텍스트를 설정하고 함수를 실행한다
   */
  run<T>(context: ITraceContext, fn: () => T): T;

  /**
   * 컨텍스트를 설정하고 비동기 함수를 실행한다
   */
  runAsync<T>(context: ITraceContext, fn: () => Promise<T>): Promise<T>;

  /**
   * 컨텍스트가 있는지 확인한다
   */
  hasContext(): boolean;
}

/**
 * AsyncLocalStorage 기반 CLS 어댑터
 */
export class AsyncLocalStorageClsAdapter implements IClsAdapter {
  constructor(private readonly storage: any) {}

  getCurrent(): ITraceContext | undefined {
    return this.storage.getStore();
  }

  run<T>(context: ITraceContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  async runAsync<T>(context: ITraceContext, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(context, fn);
  }

  hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }
}

/**
 * nestjs-cls 기반 CLS 어댑터
 */
export class NestjsClsAdapter implements IClsAdapter {
  constructor(private readonly clsService: any) {}

  getCurrent(): ITraceContext | undefined {
    return this.clsService.get<ITraceContext>('traceContext');
  }

  run<T>(context: ITraceContext, fn: () => T): T {
    return this.clsService.runWith('traceContext', context, fn);
  }

  async runAsync<T>(context: ITraceContext, fn: () => Promise<T>): Promise<T> {
    return this.clsService.runWith('traceContext', context, fn);
  }

  hasContext(): boolean {
    return this.clsService.has('traceContext');
  }
}