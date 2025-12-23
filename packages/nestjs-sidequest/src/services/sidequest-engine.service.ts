import {Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {SIDEQUEST_MODULE_OPTIONS} from '../constants.js';
import {SidequestAdapter} from '../core/sidequest.adapter.js';
import type {SidequestModuleOptions} from '../interfaces/module-options.interface.js';

/**
 * Sidequest 엔진 관리 서비스
 *
 * Sidequest.js 엔진의 라이프사이클을 관리합니다.
 * 모듈 초기화 시 엔진을 시작하고, 종료 시 graceful shutdown을 수행합니다.
 */
@Injectable()
export class SidequestEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SidequestEngineService.name);

  constructor(
    @Inject(SIDEQUEST_MODULE_OPTIONS)
    private readonly options: SidequestModuleOptions,
    private readonly adapter: SidequestAdapter,
  ) {}

  /**
   * 모듈 초기화 시 엔진 시작
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Sidequest engine...');
    await this.adapter.start(this.options);
    this.logger.log('Sidequest engine initialized');
  }

  /**
   * 모듈 종료 시 엔진 종료
   */
  async onModuleDestroy(): Promise<void> {
    const gracefulShutdown = this.options.gracefulShutdown ?? {enabled: true, timeout: 30000};

    if (gracefulShutdown.enabled) {
      this.logger.log(
        `Sidequest engine graceful shutdown (timeout: ${gracefulShutdown.timeout}ms)`,
      );
    }

    await this.adapter.shutdown();
    this.logger.log('Sidequest engine stopped');
  }

  /**
   * 엔진 시작 여부
   */
  get isStarted(): boolean {
    return this.adapter.started;
  }

  /**
   * Adapter 인스턴스 반환
   */
  getAdapter(): SidequestAdapter {
    return this.adapter;
  }
}
