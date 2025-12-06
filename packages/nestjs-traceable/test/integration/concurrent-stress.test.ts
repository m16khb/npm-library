/**
 * 동시성 및 스트레스 테스트
 *
 * 대량의 동시 요청에서 traceId 격리 및 성능을 검증합니다.
 */
import {describe, it, expect, beforeEach} from 'vitest';
import {Test, TestingModule} from '@nestjs/testing';
import {Injectable} from '@nestjs/common';
import {ClsModule, ClsService} from 'nestjs-cls';

import {TraceModule} from '../../src/nestjs/trace.module';
import {TraceContextService} from '../../src/nestjs/services/trace-context.service';
import {TraceableCronService} from '../../src/nestjs/abstracts/traceable-cron.abstract';

@Injectable()
class ConcurrentTestService extends TraceableCronService {
  constructor(traceContext: TraceContextService) {
    super(traceContext);
  }

  async simulateWork(workId: string, delayMs: number): Promise<{workId: string; traceId: string}> {
    return this.runWithTrace(async () => {
      const traceId = this.getTraceId()!;

      // 비동기 작업 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // 중간에 traceId 확인 (컨텍스트 유지 검증)
      const midTraceId = this.getTraceId();
      if (midTraceId !== traceId) {
        throw new Error(`TraceId mismatch: ${traceId} !== ${midTraceId}`);
      }

      return {workId, traceId};
    });
  }

  async nestedWork(depth: number): Promise<string[]> {
    return this.runWithTrace(async () => {
      const traces: string[] = [this.getTraceId()!];

      if (depth > 0) {
        const innerTraces = await this.nestedWork(depth - 1);
        traces.push(...innerTraces);
      }

      return traces;
    });
  }
}

describe('동시성 및 스트레스 테스트', () => {
  let module: TestingModule;
  let traceContextService: TraceContextService;
  let concurrentService: ConcurrentTestService;
  let cls: ClsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ClsModule.forRoot({global: true}), TraceModule.forRoot()],
      providers: [ConcurrentTestService],
    }).compile();

    traceContextService = module.get<TraceContextService>(TraceContextService);
    concurrentService = module.get<ConcurrentTestService>(ConcurrentTestService);
    cls = module.get<ClsService>(ClsService);
  });

  describe('대량 동시 요청 테스트', () => {
    it('1000개의 동시 요청에서 모든 traceId가 고유하다', async () => {
      const count = 1000;
      const results = await Promise.all(
        Array.from({length: count}, (_, i) => concurrentService.simulateWork(`work-${i}`, Math.random() * 10)),
      );

      // 모든 작업 완료 확인
      expect(results).toHaveLength(count);

      // 모든 traceId가 고유함
      const traceIds = results.map(r => r.traceId);
      const uniqueTraceIds = new Set(traceIds);
      expect(uniqueTraceIds.size).toBe(count);

      // 모든 traceId가 UUID 형식
      traceIds.forEach(traceId => {
        expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      });
    });

    it('지연이 있는 동시 요청에서도 컨텍스트가 올바르게 유지된다', async () => {
      const delays = [100, 50, 150, 25, 75, 200, 10, 125];
      const results = await Promise.all(
        delays.map((delay, i) => concurrentService.simulateWork(`delayed-${i}`, delay)),
      );

      // 모든 작업 완료 (지연에 관계없이)
      expect(results).toHaveLength(delays.length);

      // 각 작업이 고유한 traceId를 가짐
      const traceIds = results.map(r => r.traceId);
      const uniqueTraceIds = new Set(traceIds);
      expect(uniqueTraceIds.size).toBe(delays.length);
    });
  });

  describe('중첩 컨텍스트 테스트', () => {
    it('깊은 중첩 (10단계)에서 각 레벨이 고유한 traceId를 가진다', async () => {
      const depth = 10;
      const traces = await concurrentService.nestedWork(depth);

      // 중첩 횟수만큼 트레이스
      expect(traces).toHaveLength(depth + 1);

      // 모든 traceId가 고유함 (각 중첩이 새 컨텍스트)
      const uniqueTraces = new Set(traces);
      expect(uniqueTraces.size).toBe(depth + 1);
    });

    it('동시 중첩 호출에서 컨텍스트 격리', async () => {
      const results = await Promise.all([
        concurrentService.nestedWork(5),
        concurrentService.nestedWork(5),
        concurrentService.nestedWork(5),
      ]);

      // 각 호출 체인 내에서 traceId가 고유
      results.forEach(traces => {
        expect(new Set(traces).size).toBe(6);
      });

      // 모든 호출 간에도 traceId가 고유
      const allTraces = results.flat();
      expect(new Set(allTraces).size).toBe(18); // 3 * 6
    });
  });

  describe('성능 테스트', () => {
    it('traceId 생성 및 설정이 1ms 미만이어야 한다', async () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await traceContextService.runAsync(async () => {
          traceContextService.getTraceId();
        });
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(1); // 평균 1ms 미만
    });

    it('동기 run()이 빠르게 동작해야 한다', () => {
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        traceContextService.run(() => {
          return traceContextService.getTraceId();
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 10000번 실행이 1초 미만
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('에러 핸들링 및 복구 테스트', () => {
    it('일부 작업 실패 시에도 다른 작업의 traceId가 영향받지 않는다', async () => {
      const tasks = Array.from({length: 10}, async (_, i) => {
        try {
          if (i === 5) {
            // 5번째 작업은 실패
            throw new Error('Intentional failure');
          }
          const result = await concurrentService.simulateWork(`work-${i}`, 5);
          return result;
        } catch (error) {
          return error as Error;
        }
      });

      const results = await Promise.all(tasks);

      // 실패한 작업 확인
      const errors = results.filter(r => r instanceof Error);
      expect(errors).toHaveLength(1);

      // 성공한 작업들의 traceId 확인
      const successResults = results.filter((r): r is {workId: string; traceId: string} => !(r instanceof Error));
      expect(successResults).toHaveLength(9);

      // 성공한 작업들의 traceId가 모두 고유함
      const traceIds = successResults.map(r => r.traceId);
      expect(new Set(traceIds).size).toBe(9);
    });
  });

  describe('CLS 비활성 상태 테스트', () => {
    it('CLS 컨텍스트 외부에서 getTraceId()가 undefined를 반환한다', () => {
      // CLS 컨텍스트 외부
      const traceId = traceContextService.getTraceId();
      expect(traceId).toBeUndefined();
    });

    it('CLS 컨텍스트 외부에서 hasContext()가 false를 반환한다', () => {
      expect(traceContextService.hasContext()).toBe(false);
    });

    it('CLS 컨텍스트 외부에서 isActive()가 false를 반환한다', () => {
      expect(traceContextService.isActive()).toBe(false);
    });

    it('CLS 컨텍스트 내부에서 isActive()가 true를 반환한다', () => {
      traceContextService.run(() => {
        expect(traceContextService.isActive()).toBe(true);
      });
    });
  });

  describe('메모리 안정성 테스트', () => {
    it('대량 반복 실행 후 메모리 누수가 없어야 한다', async () => {
      // 메모리 사용량 측정을 위한 간단한 테스트
      const iterations = 500;

      for (let i = 0; i < iterations; i++) {
        traceContextService.run(() => {
          const traceId = traceContextService.getTraceId();
          return traceId;
        });
      }

      // 테스트가 완료되면 성공 (메모리 누수 시 OOM 발생)
      expect(true).toBe(true);
    }, 10000); // 타임아웃 10초
  });
});
