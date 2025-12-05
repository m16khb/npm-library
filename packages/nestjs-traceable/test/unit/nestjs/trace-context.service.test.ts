import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TraceContextService } from '../../../src/nestjs/services/trace-context.service';
import { ClsService } from 'nestjs-cls';

describe('TraceContextService', () => {
  let service: TraceContextService;
  let mockClsService: ClsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClsService = {
      get: vi.fn(),
      set: vi.fn(),
      getId: vi.fn(),
      isActive: vi.fn().mockReturnValue(true),
      run: vi.fn((fn: () => unknown) => fn()),
    } as unknown as ClsService;

    service = new TraceContextService(mockClsService);
  });

  it('should create service with cls service', () => {
    expect(service).toBeDefined();
  });

  it('should get current trace ID', () => {
    const expectedTraceId = 'test-trace-123';
    vi.mocked(mockClsService.get).mockReturnValue(expectedTraceId);

    const result = service.getTraceId();
    expect(result).toBe(expectedTraceId);
    expect(mockClsService.get).toHaveBeenCalledWith('traceId');
  });

  it('should return undefined when no trace ID exists', () => {
    vi.mocked(mockClsService.get).mockReturnValue(undefined);

    const result = service.getTraceId();
    expect(result).toBeUndefined();
  });

  it('should return undefined when CLS is not active', () => {
    vi.mocked(mockClsService.isActive).mockReturnValue(false);

    const result = service.getTraceId();
    expect(result).toBeUndefined();
  });

  it('should set trace ID', () => {
    const traceId = 'new-trace-id';
    service.setTraceId(traceId);

    expect(mockClsService.set).toHaveBeenCalledWith('traceId', traceId);
  });

  it('should not set trace ID when CLS is not active', () => {
    vi.mocked(mockClsService.isActive).mockReturnValue(false);
    service.setTraceId('test-trace');

    expect(mockClsService.set).not.toHaveBeenCalled();
  });

  it('should generate trace ID', () => {
    const result = service.generateTraceId();

    expect(result).toBeDefined();
    expect(result).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(mockClsService.set).toHaveBeenCalledWith('traceId', result);
  });

  it('should check if context exists', () => {
    vi.mocked(mockClsService.get).mockReturnValue('test-trace');

    const result = service.hasContext();
    expect(result).toBe(true);
  });

  it('should return false when no context exists', () => {
    vi.mocked(mockClsService.get).mockReturnValue(undefined);

    const result = service.hasContext();
    expect(result).toBe(false);
  });

  it('should check if CLS is active', () => {
    vi.mocked(mockClsService.isActive).mockReturnValue(true);

    const result = service.isActive();
    expect(result).toBe(true);
  });

  it('should run function with new context', () => {
    const fn = vi.fn(() => 'result');
    vi.mocked(mockClsService.run).mockImplementation((callback: () => unknown) => callback());

    const result = service.run(fn);

    expect(result).toBe('result');
    expect(mockClsService.run).toHaveBeenCalled();
    expect(mockClsService.set).toHaveBeenCalledWith('traceId', expect.any(String));
  });

  it('should run function with provided trace ID', () => {
    const fn = vi.fn(() => 'result');
    const traceId = 'custom-trace-id';

    service.run(fn, traceId);

    expect(mockClsService.set).toHaveBeenCalledWith('traceId', traceId);
  });

  it('should run async function with new context', async () => {
    const fn = vi.fn(async () => 'async-result');
    vi.mocked(mockClsService.run).mockImplementation((callback: () => unknown) => callback());

    const result = await service.runAsync(fn);

    expect(result).toBe('async-result');
    expect(mockClsService.run).toHaveBeenCalled();
  });

  it('should check if trace ID matches current trace', () => {
    vi.mocked(mockClsService.get).mockReturnValue('test-trace');

    const result = service.isSameTrace('test-trace');
    expect(result).toBe(true);
  });

  it('should return false when trace ID does not match', () => {
    vi.mocked(mockClsService.get).mockReturnValue('different-trace');

    const result = service.isSameTrace('test-trace');
    expect(result).toBe(false);
  });

  it('should get ClsService instance', () => {
    const result = service.getClsService();
    expect(result).toBe(mockClsService);
  });

  it('should handle errors gracefully in getTraceId', () => {
    vi.mocked(mockClsService.isActive).mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = service.getTraceId();
    expect(result).toBeUndefined();
  });

  it('should handle errors gracefully in hasContext', () => {
    vi.mocked(mockClsService.isActive).mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = service.hasContext();
    expect(result).toBe(false);
  });

  it('should handle errors gracefully in isSameTrace', () => {
    vi.mocked(mockClsService.get).mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = service.isSameTrace('test-trace');
    expect(result).toBe(false);
  });
});
