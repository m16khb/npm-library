import {Injectable, Logger, Optional, Inject} from '@nestjs/common';
import {SIDEQUEST_MODULE_OPTIONS} from '../constants.js';
import type {SidequestModuleOptions} from '../interfaces/module-options.interface.js';

// nestjs-cls 타입 (optional dependency)
interface ClsService {
  getId(): string | undefined;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  run<T>(callback: () => T): T;
}

/**
 * CLS(Continuation Local Storage) 통합 서비스
 *
 * nestjs-cls가 설치되어 있을 경우 Job 실행 시 context를 전파합니다.
 * nestjs-cls가 없으면 no-op으로 동작합니다.
 */
@Injectable()
export class ClsIntegrationService {
  private readonly logger = new Logger(ClsIntegrationService.name);
  private readonly enabled: boolean;
  private clsService: ClsService | null = null;

  constructor(
    @Inject(SIDEQUEST_MODULE_OPTIONS)
    options: SidequestModuleOptions,
    @Optional() @Inject('ClsService') clsService?: ClsService,
  ) {
    this.enabled = options.enableCls ?? false;
    this.clsService = clsService ?? null;

    if (this.enabled && !this.clsService) {
      this.logger.warn(
        'CLS integration is enabled but nestjs-cls is not installed. ' +
          'Install nestjs-cls to enable context propagation.',
      );
    }
  }

  /**
   * CLS context 내에서 콜백 실행
   */
  async runInContext<T>(
    metadata: Record<string, unknown>,
    callback: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled || !this.clsService) {
      return callback();
    }

    // nestjs-cls의 run 메서드를 사용하여 새 context에서 실행
    return new Promise((resolve, reject) => {
      try {
        this.clsService!.run(() => {
          // 메타데이터를 CLS에 설정
          for (const [key, value] of Object.entries(metadata)) {
            this.clsService!.set(key, value);
          }

          callback().then(resolve).catch(reject);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 현재 traceId 조회
   */
  getTraceId(): string | undefined {
    if (!this.enabled || !this.clsService) {
      return undefined;
    }

    return this.clsService.get<string>('traceId');
  }

  /**
   * traceId 설정
   */
  setTraceId(traceId: string): void {
    if (!this.enabled || !this.clsService) {
      return;
    }

    this.clsService.set('traceId', traceId);
  }

  /**
   * CLS에서 값 조회
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled || !this.clsService) {
      return undefined;
    }

    return this.clsService.get<T>(key);
  }

  /**
   * CLS에 값 설정
   */
  set<T>(key: string, value: T): void {
    if (!this.enabled || !this.clsService) {
      return;
    }

    this.clsService.set(key, value);
  }

  /**
   * CLS 통합 활성화 여부
   */
  isEnabled(): boolean {
    return this.enabled && this.clsService !== null;
  }
}
