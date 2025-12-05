import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TraceContextService } from '../../../src/nestjs/services/trace-context.service';
import { TraceContextManager } from '../../../src/core/context';
import type { ITraceContext, ILoggerAdapter } from '../../../src/core/interfaces';

describe('TraceContextService', () => {
  let service: TraceContextService;
  let mockContextManager: TraceContextManager;
  let mockLogger: ILoggerAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContextManager = {
      getCurrent: vi.fn(),
      create: vi.fn(),
      run: vi.fn(),
      runAsync: vi.fn(),
      createChild: vi.fn(),
      hasContext: vi.fn(),
      getCurrentTraceId: vi.fn(),
      getCurrentSpanId: vi.fn(),
      isSameTrace: vi.fn(),
    } as any;

    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };

    service = new TraceContextService(mockContextManager, mockLogger);
  });

  it('should create service with context manager', () => {
    expect(service).toBeDefined();
  });

  it('should get current trace ID', () => {
    const expectedTraceId = 'test-trace-123';
    vi.mocked(mockContextManager.getCurrentTraceId).mockReturnValue(expectedTraceId);

    const result = service.getTraceId();
    expect(result).toBe(expectedTraceId);
    expect(mockContextManager.getCurrentTraceId).toHaveBeenCalled();
  });

  it('should return undefined when no trace ID exists', () => {
    vi.mocked(mockContextManager.getCurrentTraceId).mockReturnValue(undefined);

    const result = service.getTraceId();
    expect(result).toBeUndefined();
  });

  it('should get current span ID', () => {
    const expectedSpanId = '12345678';
    vi.mocked(mockContextManager.getCurrentSpanId).mockReturnValue(expectedSpanId);

    const result = service.getSpanId();
    expect(result).toBe(expectedSpanId);
    expect(mockContextManager.getCurrentSpanId).toHaveBeenCalled();
  });

  it('should get current context', () => {
    const expectedContext: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    vi.mocked(mockContextManager.getCurrent).mockReturnValue(expectedContext);

    const result = service.getContext();
    expect(result).toEqual(expectedContext);
    expect(mockContextManager.getCurrent).toHaveBeenCalled();
  });

  it('should check if context exists', () => {
    vi.mocked(mockContextManager.hasContext).mockReturnValue(true);

    const result = service.hasContext();
    expect(result).toBe(true);
    expect(mockContextManager.hasContext).toHaveBeenCalled();
  });

  it('should create child context', () => {
    const expectedChild: ITraceContext = {
      traceId: 'parent-trace',
      spanId: 'child-span',
      parentSpanId: 'parent-span',
      startTime: Date.now(),
    };

    vi.mocked(mockContextManager.createChild).mockReturnValue(expectedChild);

    const result = service.createChild();
    expect(result).toEqual(expectedChild);
    expect(mockContextManager.createChild).toHaveBeenCalled();
  });

  it('should run function with new context', () => {
    const newContext: ITraceContext = {
      traceId: 'new-trace',
      spanId: 'new-span',
      startTime: Date.now(),
    };

    const fn = vi.fn(() => 'result');
    vi.mocked(mockContextManager.run).mockReturnValue('result');

    const result = service.runWithContext(newContext, fn);

    expect(result).toBe('result');
    expect(mockContextManager.run).toHaveBeenCalledWith(newContext, fn);
  });

  it('should run async function with new context', async () => {
    const newContext: ITraceContext = {
      traceId: 'new-trace',
      spanId: 'new-span',
      startTime: Date.now(),
    };

    const fn = vi.fn(async () => 'async-result');
    vi.mocked(mockContextManager.runAsync).mockResolvedValue('async-result');

    const result = await service.runWithContextAsync(newContext, fn);

    expect(result).toBe('async-result');
    expect(mockContextManager.runAsync).toHaveBeenCalledWith(newContext, fn);
  });

  it('should log context information', () => {
    const context: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    vi.mocked(mockContextManager.getCurrent).mockReturnValue(context);

    service.logContext();

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('test-trace'),
      context,
    );
  });

  it('should log warning when no context exists', () => {
    vi.mocked(mockContextManager.getCurrent).mockReturnValue(undefined);

    service.logContext();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'No trace context available'
    );
  });

  it('should check if trace ID matches current trace', () => {
    vi.mocked(mockContextManager.isSameTrace).mockReturnValue(true);

    const result = service.isSameTrace('test-trace');
    expect(result).toBe(true);
    expect(mockContextManager.isSameTrace).toHaveBeenCalledWith('test-trace');
  });

  it('should create context with validation', () => {
    const traceId = 'test-trace';
    const spanId = 'test-span';
    const parentSpanId = 'parent';

    const expectedContext: ITraceContext = {
      traceId,
      spanId,
      parentSpanId,
      startTime: Date.now(),
    };

    vi.mocked(mockContextManager.create).mockReturnValue(expectedContext);

    const result = service.createContext(traceId, spanId, parentSpanId);
    expect(result).toEqual(expectedContext);
    expect(mockContextManager.create).toHaveBeenCalledWith(traceId, spanId, parentSpanId);
  });

  it('should handle errors gracefully', () => {
    const error = new Error('Test error');
    vi.mocked(mockContextManager.getCurrent).mockImplementation(() => {
      throw error;
    });

    expect(() => service.getContext()).toThrow('Test error');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error getting trace context',
      error,
    );
  });

  it('should handle async errors gracefully', async () => {
    const error = new Error('Async test error');
    const context: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    vi.mocked(mockContextManager.getCurrent).mockReturnValue(context);
    vi.mocked(mockContextManager.runAsync).mockRejectedValue(error);

    const fn = vi.fn(async () => 'result');

    await expect(service.runWithContextAsync(context, fn)).rejects.toThrow('Async test error');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error running with context',
      error,
    );
  });
});