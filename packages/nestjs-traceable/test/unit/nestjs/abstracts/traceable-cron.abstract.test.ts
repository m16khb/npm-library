import {describe, it, expect, beforeEach, vi} from 'vitest';
import {TraceableCronService} from '../../../../src/nestjs/abstracts/traceable-cron.abstract';
import {TraceContextService} from '../../../../src/nestjs/services/trace-context.service';

// 테스트용 구체 클래스
class TestCronService extends TraceableCronService {
  constructor(traceContext: TraceContextService) {
    super(traceContext);
  }

  // protected 메서드를 테스트용으로 노출
  public async testRunWithTrace<T>(fn: () => Promise<T>, traceId?: string) {
    return this.runWithTrace(fn, traceId);
  }

  public testGetTraceId() {
    return this.getTraceId();
  }

  public testSet<T>(key: string, value: T) {
    return this.set(key, value);
  }

  public testGet<T>(key: string) {
    return this.get<T>(key);
  }
}

describe('TraceableCronService', () => {
  let service: TestCronService;
  let mockTraceContext: TraceContextService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTraceContext = {
      getTraceId: vi.fn(),
      setTraceId: vi.fn(),
      runAsync: vi.fn((fn: () => Promise<unknown>) => fn()),
      set: vi.fn(),
      get: vi.fn(),
    } as unknown as TraceContextService;

    service = new TestCronService(mockTraceContext);
  });

  describe('constructor', () => {
    it('TraceContextService가 없으면 에러를 던진다', () => {
      expect(() => new TestCronService(null as unknown as TraceContextService)).toThrow(
        'TraceableCronService requires TraceContextService to be injected',
      );
    });

    it('TraceContextService가 있으면 정상 생성된다', () => {
      expect(service).toBeDefined();
    });
  });

  describe('runWithTrace', () => {
    it('새 CLS 컨텍스트에서 함수를 실행한다', async () => {
      const fn = vi.fn(async () => 'result');

      const result = await service.testRunWithTrace(fn);

      expect(result).toBe('result');
      expect(mockTraceContext.runAsync).toHaveBeenCalledWith(fn, undefined);
    });

    it('제공된 traceId를 사용한다', async () => {
      const fn = vi.fn(async () => 'result');
      const traceId = 'custom-trace-id';

      await service.testRunWithTrace(fn, traceId);

      expect(mockTraceContext.runAsync).toHaveBeenCalledWith(fn, traceId);
    });
  });

  describe('getTraceId', () => {
    it('TraceContextService에서 traceId를 가져온다', () => {
      const expectedTraceId = 'test-trace-123';
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(expectedTraceId);

      const result = service.testGetTraceId();

      expect(result).toBe(expectedTraceId);
      expect(mockTraceContext.getTraceId).toHaveBeenCalled();
    });

    it('traceId가 없으면 undefined 반환', () => {
      vi.mocked(mockTraceContext.getTraceId).mockReturnValue(undefined);

      const result = service.testGetTraceId();

      expect(result).toBeUndefined();
    });
  });

  describe('set/get', () => {
    it('set은 TraceContextService.set을 호출한다', () => {
      service.testSet('key', 'value');

      expect(mockTraceContext.set).toHaveBeenCalledWith('key', 'value');
    });

    it('get은 TraceContextService.get을 호출한다', () => {
      vi.mocked(mockTraceContext.get).mockReturnValue('value');

      const result = service.testGet<string>('key');

      expect(result).toBe('value');
      expect(mockTraceContext.get).toHaveBeenCalledWith('key');
    });
  });
});
