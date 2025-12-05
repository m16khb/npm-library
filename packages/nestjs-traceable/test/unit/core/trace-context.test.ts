import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TraceContextManager } from '../../../src/core/context/trace-context';
import { AsyncLocalStorageManager } from '../../../src/core/context/async-storage';
import { DefaultTraceIdGenerator } from '../../../src/core/generators/trace-id.generator';
import { DefaultSpanIdGenerator } from '../../../src/core/generators/span-id.generator';
import type { ITraceContext } from '../../../src/core/interfaces';

// Mock AsyncLocalStorageManager
vi.mock('../../../src/core/context/async-storage');

describe('TraceContextManager', () => {
  let manager: TraceContextManager;
  let mockStorage: AsyncLocalStorageManager;
  let traceIdGenerator: DefaultTraceIdGenerator;
  let spanIdGenerator: DefaultSpanIdGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = new AsyncLocalStorageManager() as any;
    traceIdGenerator = new DefaultTraceIdGenerator();
    spanIdGenerator = new DefaultSpanIdGenerator();
    manager = new TraceContextManager(mockStorage, traceIdGenerator, spanIdGenerator);
  });

  it('should create manager with default generators', () => {
    const defaultManager = new TraceContextManager();
    expect(defaultManager).toBeDefined();
  });

  it('should get current context from storage', () => {
    const expectedContext: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    vi.mocked(mockStorage.getCurrent).mockReturnValue(expectedContext);

    const result = manager.getCurrent();
    expect(result).toEqual(expectedContext);
  });

  it('should return undefined when no context exists', () => {
    vi.mocked(mockStorage.getCurrent).mockReturnValue(undefined);

    const result = manager.getCurrent();
    expect(result).toBeUndefined();
  });

  it('should create new context with provided values', () => {
    const traceId = 'custom-trace-id';
    const spanId = 'abcd1234';
    const parentSpanId = 'efgh5678';

    const context = manager.create(traceId, spanId, parentSpanId);

    expect(context).toEqual({
      traceId,
      spanId,
      parentSpanId,
      startTime: expect.any(Number),
    });
    expect(context.startTime).toBeCloseTo(Date.now(), -2); // Within 100ms
  });

  it('should generate spanId when not provided', () => {
    const traceId = 'test-trace';
    const generatedSpanId = spanIdGenerator.generate();

    const context = manager.create(traceId);

    expect(context.traceId).toBe(traceId);
    expect(context.spanId).toBe(generatedSpanId);
    expect(context.parentSpanId).toBeUndefined();
    expect(context.startTime).toBeDefined();
  });

  it('should run function with context', () => {
    const context: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    const fn = vi.fn(() => 'result');
    vi.mocked(mockStorage.run).mockReturnValue('result');

    const result = manager.run(context, fn);

    expect(mockStorage.run).toHaveBeenCalledWith(context, fn);
    expect(result).toBe('result');
  });

  it('should run async function with context', async () => {
    const context: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    const fn = vi.fn(async () => 'async-result');
    vi.mocked(mockStorage.runAsync).mockResolvedValue('async-result');

    const result = await manager.runAsync(context, fn);

    expect(mockStorage.runAsync).toHaveBeenCalledWith(context, fn);
    expect(result).toBe('async-result');
  });

  it('should create child context when current context exists', () => {
    const parentContext: ITraceContext = {
      traceId: 'parent-trace',
      spanId: '11111111',
      startTime: Date.now(),
    };

    const childSpanId = '22222222';

    vi.mocked(mockStorage.getCurrent).mockReturnValue(parentContext);
    vi.mocked(spanIdGenerator.generate).mockReturnValue(childSpanId);

    const childContext = manager.createChild();

    expect(childContext).toBeDefined();
    expect(childContext?.traceId).toBe(parentContext.traceId);
    expect(childContext?.parentSpanId).toBe(parentContext.spanId);
    expect(childContext?.spanId).toBe(childSpanId);
    expect(childContext?.startTime).toBeCloseTo(Date.now(), -2);
  });

  it('should return undefined when creating child without parent', () => {
    vi.mocked(mockStorage.getCurrent).mockReturnValue(undefined);

    const childContext = manager.createChild();

    expect(childContext).toBeUndefined();
  });

  it('should create child with custom spanId', () => {
    const parentContext: ITraceContext = {
      traceId: 'parent-trace',
      spanId: '11111111',
      startTime: Date.now(),
    };

    const customSpanId = 'custom123';

    vi.mocked(mockStorage.getCurrent).mockReturnValue(parentContext);

    const childContext = manager.createChild(customSpanId);

    expect(childContext?.spanId).toBe(customSpanId);
  });

  it('should validate traceId in create method', () => {
    const invalidTraceId = '';
    const validTraceId = 'valid-trace-id';

    expect(() => manager.create(invalidTraceId)).toThrow();
    expect(() => manager.create(validTraceId)).not.toThrow();
  });

  it('should validate spanId in create method', () => {
    const traceId = 'test-trace';
    const invalidSpanId = 'invalid';

    expect(() => manager.create(traceId, invalidSpanId)).toThrow();
  });

  it('should maintain traceId when creating child', () => {
    const parentContext: ITraceContext = {
      traceId: 'parent-trace-id',
      spanId: '11111111',
      startTime: Date.now(),
    };

    vi.mocked(mockStorage.getCurrent).mockReturnValue(parentContext);

    const childContext = manager.createChild();

    expect(childContext?.traceId).toBe(parentContext.traceId);
  });

  it('should handle nested child contexts', () => {
    const rootContext: ITraceContext = {
      traceId: 'root-trace',
      spanId: '11111111',
      startTime: Date.now(),
    };

    const firstChildSpanId = '22222222';
    const secondChildSpanId = '33333333';

    vi.mocked(mockStorage.getCurrent).mockReturnValue(rootContext);
    vi.mocked(spanIdGenerator.generate)
      .mockReturnValueOnce(firstChildSpanId)
      .mockReturnValueOnce(secondChildSpanId);

    // Create first child
    const firstChild = manager.createChild();

    // Now simulate running with first child
    vi.mocked(mockStorage.getCurrent).mockReturnValue(firstChild!);

    // Create second child (should be nested)
    const secondChild = manager.createChild();

    expect(firstChild?.parentSpanId).toBe(rootContext.spanId);
    expect(secondChild?.parentSpanId).toBe(firstChildSpanId);
    expect(firstChild?.traceId).toBe(rootContext.traceId);
    expect(secondChild?.traceId).toBe(rootContext.traceId);
  });
});