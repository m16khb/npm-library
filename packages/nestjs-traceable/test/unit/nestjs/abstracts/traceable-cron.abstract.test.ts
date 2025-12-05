import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClsService } from 'nestjs-cls';
import { TraceableCronService } from '../../../../src/nestjs/abstracts/traceable-cron.abstract';
import { TRACE_ID_KEY } from '../../../../src/nestjs/services/trace-context.service';

// 테스트용 구체 클래스
class TestCronService extends TraceableCronService {
  constructor(cls: ClsService) {
    super(cls);
  }

  // protected 메서드를 테스트용으로 노출
  public async testRunWithTrace<T>(fn: () => Promise<T>, traceId?: string) {
    return this.runWithTrace(fn, traceId);
  }

  public testGetTraceId() {
    return this.getTraceId();
  }
}

describe('TraceableCronService', () => {
  let service: TestCronService;
  let mockClsService: ClsService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClsService = {
      get: vi.fn(),
      set: vi.fn(),
      isActive: vi.fn().mockReturnValue(true),
      run: vi.fn((fn: () => unknown) => fn()),
    } as unknown as ClsService;

    service = new TestCronService(mockClsService);
  });

  describe('constructor', () => {
    it('ClsService가 없으면 에러를 던진다', () => {
      expect(() => new TestCronService(null as unknown as ClsService)).toThrow(
        'TraceableCronService requires ClsService to be injected',
      );
    });

    it('ClsService가 있으면 정상 생성된다', () => {
      expect(service).toBeDefined();
    });
  });

  describe('runWithTrace', () => {
    it('새 CLS 컨텍스트에서 함수를 실행한다', async () => {
      const fn = vi.fn(async () => 'result');

      const result = await service.testRunWithTrace(fn);

      expect(result).toBe('result');
      expect(mockClsService.run).toHaveBeenCalled();
      expect(mockClsService.set).toHaveBeenCalledWith(TRACE_ID_KEY, expect.any(String));
    });

    it('제공된 traceId를 사용한다', async () => {
      const fn = vi.fn(async () => 'result');
      const traceId = 'custom-trace-id';

      await service.testRunWithTrace(fn, traceId);

      expect(mockClsService.set).toHaveBeenCalledWith(TRACE_ID_KEY, traceId);
    });

    it('traceId 미제공 시 UUID를 생성한다', async () => {
      const fn = vi.fn(async () => 'result');

      await service.testRunWithTrace(fn);

      expect(mockClsService.set).toHaveBeenCalledWith(TRACE_ID_KEY, expect.stringMatching(/^[0-9a-f-]{36}$/));
    });
  });

  describe('getTraceId', () => {
    it('CLS에서 traceId를 가져온다', () => {
      const expectedTraceId = 'test-trace-123';
      vi.mocked(mockClsService.get).mockReturnValue(expectedTraceId);

      const result = service.testGetTraceId();

      expect(result).toBe(expectedTraceId);
      expect(mockClsService.get).toHaveBeenCalledWith(TRACE_ID_KEY);
    });

    it('CLS가 비활성화되면 undefined 반환', () => {
      vi.mocked(mockClsService.isActive).mockReturnValue(false);

      const result = service.testGetTraceId();

      expect(result).toBeUndefined();
    });

    it('에러 발생 시 undefined 반환', () => {
      vi.mocked(mockClsService.isActive).mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = service.testGetTraceId();

      expect(result).toBeUndefined();
    });
  });
});
