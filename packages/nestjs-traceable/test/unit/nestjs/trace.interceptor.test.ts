import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TraceInterceptor } from '../../../src/nestjs/interceptors/trace.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError, firstValueFrom } from 'rxjs';
import { TraceContextService } from '../../../src/nestjs/services/trace-context.service';

describe('TraceInterceptor', () => {
  let interceptor: TraceInterceptor;
  let mockTraceService: TraceContextService;
  let mockReflector: Reflector;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTraceService = {
      getTraceId: vi.fn().mockReturnValue('test-trace'),
      hasContext: vi.fn().mockReturnValue(true),
    } as unknown as TraceContextService;

    mockReflector = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    interceptor = new TraceInterceptor(mockTraceService, mockReflector);

    mockNext = vi.fn().mockReturnValue('test-result');

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of(mockNext())),
    };

    // 함수 객체를 직접 생성하여 name 속성을 설정
    function testMethod() {
      return 'test-method';
    }

    mockContext = {
      getHandler: vi.fn().mockReturnValue(testMethod),
      getClass: vi.fn().mockReturnValue(class TestClass {}),
      switchToHttp: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getArgs: vi.fn().mockReturnValue([]),
      getArgByIndex: vi.fn(),
      getType: vi.fn().mockReturnValue('http'),
    } as unknown as ExecutionContext;
  });

  describe('Basic functionality', () => {
    it('should intercept method execution', async () => {
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      const result = await firstValueFrom(result$);
      expect(result).toBe('test-result');
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should use operation name from trace metadata', async () => {
      // @Trace('custom-operation') 메타데이터 시뮬레이션
      vi.mocked(mockReflector.get).mockReturnValue('custom-operation');

      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      const result = await firstValueFrom(result$);
      expect(result).toBe('test-result');
    });

    it('should use method name when no operation name provided', async () => {
      vi.mocked(mockReflector.get).mockReturnValue(undefined);

      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      const result = await firstValueFrom(result$);
      expect(result).toBe('test-result');
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      vi.mocked(mockCallHandler.handle).mockReturnValue(throwError(() => error));

      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      await expect(firstValueFrom(result$)).rejects.toThrow('Test error');
    });

    it('should skip when no trace context exists', async () => {
      vi.mocked(mockTraceService.hasContext).mockReturnValue(false);

      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      const result = await firstValueFrom(result$);
      expect(result).toBe('test-result');
    });

    it('should work with async methods', async () => {
      vi.mocked(mockCallHandler.handle).mockReturnValue(of(Promise.resolve('async-result')));

      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      const result = await firstValueFrom(result$);
      expect(result).toBe('async-result');
    });

    it('should handle traceable class metadata', async () => {
      vi.mocked(mockReflector.get)
        .mockReturnValueOnce(undefined) // trace:operation
        .mockReturnValueOnce(true); // traceable:enabled

      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      const result = await firstValueFrom(result$);
      expect(result).toBe('test-result');
    });
  });
});
