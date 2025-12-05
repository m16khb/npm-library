import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClsService } from 'nestjs-cls';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import {
  TraceKafkaInterceptor,
  createKafkaTraceHeaders,
} from '../../../../src/nestjs/interceptors/trace-kafka.interceptor';
import { TRACE_ID_KEY } from '../../../../src/nestjs/services/trace-context.service';

describe('TraceKafkaInterceptor', () => {
  let interceptor: TraceKafkaInterceptor;
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

    interceptor = new TraceKafkaInterceptor(mockCls);

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

  describe('Kafka 컨텍스트', () => {
    it('메시지 헤더에서 traceId를 추출하여 CLS에 설정한다', async () => {
      const mockKafkaContext = {
        getMessage: vi.fn().mockReturnValue({
          headers: { 'x-trace-id': 'kafka-trace-id' },
          value: Buffer.from('test'),
        }),
        getTopic: vi.fn().mockReturnValue('test-topic'),
        getPartition: vi.fn().mockReturnValue(0),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockKafkaContext),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      const result = await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(result).toEqual({ result: 'success' });
      expect(mockCls.run).toHaveBeenCalled();
      expect(mockCls.set).toHaveBeenCalledWith(TRACE_ID_KEY, 'kafka-trace-id');
    });

    it('메시지 헤더에 traceId가 없으면 새로 생성한다', async () => {
      const mockKafkaContext = {
        getMessage: vi.fn().mockReturnValue({
          headers: {},
          value: Buffer.from('test'),
        }),
        getTopic: vi.fn().mockReturnValue('test-topic'),
        getPartition: vi.fn().mockReturnValue(0),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockKafkaContext),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalled();
      const [key, value] = mockCls.set.mock.calls[0];
      expect(key).toBe(TRACE_ID_KEY);
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[0-9a-f-]{36}$/); // UUID 형식
    });

    it('헤더가 없는 메시지도 처리한다', async () => {
      const mockKafkaContext = {
        getMessage: vi.fn().mockReturnValue({
          value: Buffer.from('test'),
          // headers 없음
        }),
        getTopic: vi.fn().mockReturnValue('test-topic'),
        getPartition: vi.fn().mockReturnValue(0),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockKafkaContext),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalled();
    });

    it('Buffer 형태의 traceId도 처리한다', async () => {
      const mockKafkaContext = {
        getMessage: vi.fn().mockReturnValue({
          headers: { 'x-trace-id': Buffer.from('buffer-trace-id') },
          value: Buffer.from('test'),
        }),
        getTopic: vi.fn().mockReturnValue('test-topic'),
        getPartition: vi.fn().mockReturnValue(0),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockKafkaContext),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalledWith(TRACE_ID_KEY, 'buffer-trace-id');
    });

    it('KafkaContext가 아닌 RPC 컨텍스트는 새 traceId를 생성한다', async () => {
      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(null),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalled();
    });
  });

  describe('커스텀 헤더명', () => {
    it('커스텀 헤더명으로 traceId를 추출한다', async () => {
      const customInterceptor = new TraceKafkaInterceptor(mockCls, 'custom-trace-header');

      const mockKafkaContext = {
        getMessage: vi.fn().mockReturnValue({
          headers: { 'custom-trace-header': 'custom-trace-id' },
          value: Buffer.from('test'),
        }),
        getTopic: vi.fn().mockReturnValue('test-topic'),
        getPartition: vi.fn().mockReturnValue(0),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockKafkaContext),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await firstValueFrom(customInterceptor.intercept(mockContext, mockCallHandler));

      expect(mockCls.set).toHaveBeenCalledWith(TRACE_ID_KEY, 'custom-trace-id');
    });
  });

  describe('에러 처리', () => {
    it('핸들러 에러를 전파한다', async () => {
      const error = new Error('Handler error');
      mockCallHandler.handle = vi.fn().mockReturnValue(throwError(() => error));

      const mockKafkaContext = {
        getMessage: vi.fn().mockReturnValue({
          headers: { 'x-trace-id': 'test-trace-id' },
          value: Buffer.from('test'),
        }),
        getTopic: vi.fn().mockReturnValue('test-topic'),
        getPartition: vi.fn().mockReturnValue(0),
      };

      mockContext = {
        getType: vi.fn().mockReturnValue('rpc'),
        switchToRpc: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(mockKafkaContext),
        }),
      } as unknown as jest.Mocked<ExecutionContext>;

      await expect(firstValueFrom(interceptor.intercept(mockContext, mockCallHandler))).rejects.toThrow(
        'Handler error',
      );
    });
  });
});

describe('createKafkaTraceHeaders', () => {
  let mockCls: jest.Mocked<ClsService>;

  beforeEach(() => {
    mockCls = {
      isActive: vi.fn(),
      get: vi.fn(),
    } as unknown as jest.Mocked<ClsService>;
  });

  it('CLS에서 traceId를 읽어 헤더를 생성한다', () => {
    mockCls.isActive.mockReturnValue(true);
    mockCls.get.mockReturnValue('existing-trace-id');

    const headers = createKafkaTraceHeaders(mockCls);

    expect(headers).toEqual({ 'x-trace-id': 'existing-trace-id' });
  });

  it('CLS가 비활성화되면 새 traceId를 생성한다', () => {
    mockCls.isActive.mockReturnValue(false);

    const headers = createKafkaTraceHeaders(mockCls);

    expect(headers['x-trace-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('CLS에 traceId가 없으면 새로 생성한다', () => {
    mockCls.isActive.mockReturnValue(true);
    mockCls.get.mockReturnValue(undefined);

    const headers = createKafkaTraceHeaders(mockCls);

    expect(headers['x-trace-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('커스텀 헤더명을 사용할 수 있다', () => {
    mockCls.isActive.mockReturnValue(true);
    mockCls.get.mockReturnValue('trace-123');

    const headers = createKafkaTraceHeaders(mockCls, 'custom-header');

    expect(headers).toEqual({ 'custom-header': 'trace-123' });
  });

  it('CLS 에러 시 새 traceId를 생성한다', () => {
    mockCls.isActive.mockImplementation(() => {
      throw new Error('CLS error');
    });

    const headers = createKafkaTraceHeaders(mockCls);

    expect(headers['x-trace-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
