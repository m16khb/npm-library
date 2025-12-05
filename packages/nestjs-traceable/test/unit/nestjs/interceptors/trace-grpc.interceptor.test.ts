import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClsService } from 'nestjs-cls';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, Observable, throwError } from 'rxjs';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { TraceGrpcInterceptor } from '../../../../src/nestjs/interceptors/trace-grpc.interceptor';
import { TRACE_ID_KEY } from '../../../../src/nestjs/services/trace-context.service';

describe('TraceGrpcInterceptor', () => {
  let interceptor: TraceGrpcInterceptor;
  let mockCls: jest.Mocked<ClsService>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;

  beforeEach(() => {
    mockCls = {
      run: vi.fn((fn: () => unknown) => fn()),
      set: vi.fn(),
      get: vi.fn(),
      isActive: vi.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<ClsService>;

    interceptor = new TraceGrpcInterceptor(mockCls);

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ result: 'success' })),
    } as unknown as jest.Mocked<CallHandler>;
  });

  describe('HTTP 컨텍스트 (통과)', () => {
    it('HTTP 요청은 그대로 통과시킨다', async () => {
      mockContext = {
        getType: vi.fn().mockReturnValue('http'),
        switchToRpc: vi.fn(),
      } as unknown as jest.Mocked<ExecutionContext>;

      const result = await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(result).toEqual({ result: 'success' });
      expect(mockCls.run).not.toHaveBeenCalled();
    });
  });

  describe('gRPC 컨텍스트', () => {
    it('Metadata에서 traceId를 추출하여 CLS에 설정한다', async () => {
      const mockMetadata = {
        get: vi.fn().mockReturnValue(['test-trace-id']),
        set: vi.fn(),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockMetadata),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      const result = await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(result).toEqual({ result: 'success' });
      expect(mockCls.run).toHaveBeenCalled();
      expect(mockCls.set).toHaveBeenCalledWith(TRACE_ID_KEY, 'test-trace-id');
    });

    it('Metadata에 traceId가 없으면 새로 생성한다', async () => {
      const mockMetadata = {
        get: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockMetadata),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalled();
      const [key, value] = mockCls.set.mock.calls[0];
      expect(key).toBe(TRACE_ID_KEY);
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[0-9a-f-]{36}$/); // UUID 형식
    });

    it('Metadata가 없으면 새 traceId를 생성한다', async () => {
      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(null),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalled();
      const [key, value] = mockCls.set.mock.calls[0];
      expect(key).toBe(TRACE_ID_KEY);
      expect(typeof value).toBe('string');
    });

    it('Buffer 형태의 traceId도 처리한다', async () => {
      const mockMetadata = {
        get: vi.fn().mockReturnValue([Buffer.from('buffer-trace-id')]),
        set: vi.fn(),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockMetadata),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalledWith(TRACE_ID_KEY, 'buffer-trace-id');
    });

    it('응답 메타데이터에 traceId를 설정한다', async () => {
      const mockMetadata = {
        get: vi.fn().mockReturnValue(['test-trace-id']),
        set: vi.fn(),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockMetadata),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockMetadata.set).toHaveBeenCalledWith('x-trace-id', 'test-trace-id');
    });
  });

  describe('커스텀 헤더명', () => {
    it('커스텀 헤더명으로 traceId를 추출한다', async () => {
      const customInterceptor = new TraceGrpcInterceptor(mockCls, 'custom-trace-header');

      const mockMetadata = {
        get: vi.fn().mockReturnValue(['custom-trace-id']),
        set: vi.fn(),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockMetadata),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(customInterceptor.intercept(mockContext, mockCallHandler));

      expect(mockMetadata.get).toHaveBeenCalledWith('custom-trace-header');
      expect(mockCls.set).toHaveBeenCalledWith(TRACE_ID_KEY, 'custom-trace-id');
    });
  });

  describe('에러 처리', () => {
    it('핸들러 에러를 전파한다', async () => {
      const error = new Error('Handler error');
      mockCallHandler.handle = vi.fn().mockReturnValue(throwError(() => error));

      const mockMetadata = {
        get: vi.fn().mockReturnValue(['test-trace-id']),
        set: vi.fn(),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockMetadata),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await expect(firstValueFrom(interceptor.intercept(mockContext, mockCallHandler))).rejects.toThrow(
        'Handler error',
      );
    });
  });
});
