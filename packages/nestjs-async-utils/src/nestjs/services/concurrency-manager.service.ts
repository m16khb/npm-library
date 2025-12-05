import {Injectable} from '@nestjs/common';

import {pLimit} from '../../core/concurrency/p-limit.js';
import type {LimitFunction} from '../../core/concurrency/types.js';
import type {MethodConcurrencyState} from '../interfaces/concurrency-options.interface.js';

/**
 * 동시성 항목
 */
interface ConcurrencyEntry {
  limiter: LimitFunction;
  concurrency: number;
  createdAt: number;
}

/**
 * 메서드별 동시성 제한을 관리하는 서비스
 *
 * 각 메서드에 대해 독립적인 pLimit 인스턴스를 생성하고 관리합니다.
 */
@Injectable()
export class ConcurrencyManagerService {
  private readonly limiters = new Map<string, ConcurrencyEntry>();

  /**
   * 특정 메서드의 limiter를 가져오거나 생성
   *
   * @param className 클래스 이름
   * @param methodName 메서드 이름
   * @param concurrency 동시성 제한 수
   * @returns LimitFunction
   */
  getLimiter(className: string, methodName: string, concurrency: number): LimitFunction {
    const key = `${className}.${methodName}`;

    const existing = this.limiters.get(key);
    if (existing) {
      // 동시성 설정이 변경된 경우 업데이트
      if (existing.concurrency !== concurrency) {
        existing.limiter.setConcurrency(concurrency);
        existing.concurrency = concurrency;
      }
      return existing.limiter;
    }

    // 새 limiter 생성
    const limiter = pLimit(concurrency);
    this.limiters.set(key, {
      limiter,
      concurrency,
      createdAt: Date.now(),
    });

    return limiter;
  }

  /**
   * 특정 메서드의 동시성 상태 조회
   *
   * @param className 클래스 이름
   * @param methodName 메서드 이름
   * @returns 동시성 상태 또는 undefined
   */
  getState(className: string, methodName: string): MethodConcurrencyState | undefined {
    const key = `${className}.${methodName}`;
    const entry = this.limiters.get(key);

    if (!entry) {
      return undefined;
    }

    const state = entry.limiter.getState();
    return {
      active: state.active,
      pending: state.pending,
      limit: state.concurrency,
      processed: state.processed,
    };
  }

  /**
   * 모든 메서드의 동시성 상태 조회
   *
   * @returns 메서드별 동시성 상태 Map
   */
  getAllStates(): Map<string, MethodConcurrencyState> {
    const states = new Map<string, MethodConcurrencyState>();

    for (const [key, entry] of this.limiters) {
      const state = entry.limiter.getState();
      states.set(key, {
        active: state.active,
        pending: state.pending,
        limit: state.concurrency,
        processed: state.processed,
      });
    }

    return states;
  }

  /**
   * 특정 메서드의 대기 중인 작업 취소
   *
   * @param className 클래스 이름
   * @param methodName 메서드 이름
   */
  clearQueue(className: string, methodName: string): void {
    const key = `${className}.${methodName}`;
    const entry = this.limiters.get(key);
    entry?.limiter.clearQueue();
  }

  /**
   * 모든 limiter의 대기 중인 작업 취소
   */
  clearAllQueues(): void {
    for (const entry of this.limiters.values()) {
      entry.limiter.clearQueue();
    }
  }
}
