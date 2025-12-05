import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncLocalStorageManager } from '../../../src/core/context/async-storage';
import type { ITraceContext } from '../../../src/core/interfaces';

describe('AsyncLocalStorageManager', () => {
  let manager: AsyncLocalStorageManager;

  beforeEach(() => {
    manager = new AsyncLocalStorageManager();
  });

  it('should initialize with no context', () => {
    expect(manager.getCurrent()).toBeUndefined();
  });

  it('should run with context', () => {
    const context: ITraceContext = {
      traceId: 'test-trace-123',
      spanId: '12345678',
      startTime: Date.now(),
    };

    const result = manager.run(context, () => {
      return manager.getCurrent();
    });

    expect(result).toEqual(context);
  });

  it('should run async with context', async () => {
    const context: ITraceContext = {
      traceId: 'test-trace-123',
      spanId: '12345678',
      startTime: Date.now(),
    };

    const result = await manager.runAsync(context, async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return manager.getCurrent();
    });

    expect(result).toEqual(context);
  });

  it('should maintain context across async operations', async () => {
    const context: ITraceContext = {
      traceId: 'test-trace-123',
      spanId: '12345678',
      startTime: Date.now(),
    };

    const results: ITraceContext[] = [];

    await manager.runAsync(context, async () => {
      results.push(manager.getCurrent()!);

      await Promise.all([
        (async () => {
          results.push(manager.getCurrent()!);
        })(),
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          results.push(manager.getCurrent()!);
        })(),
      ]);
    });

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result).toEqual(context);
    });
  });

  it('should isolate context between different runs', () => {
    const context1: ITraceContext = {
      traceId: 'trace-1',
      spanId: '11111111',
      startTime: Date.now(),
    };

    const context2: ITraceContext = {
      traceId: 'trace-2',
      spanId: '22222222',
      startTime: Date.now(),
    };

    let result1: ITraceContext | undefined;
    let result2: ITraceContext | undefined;

    manager.run(context1, () => {
      result1 = manager.getCurrent();
    });

    manager.run(context2, () => {
      result2 = manager.getCurrent();
    });

    expect(result1).toEqual(context1);
    expect(result2).toEqual(context2);
  });

  it('should handle nested context runs', () => {
    const outerContext: ITraceContext = {
      traceId: 'outer-trace',
      spanId: 'aaaaaaaa',
      startTime: Date.now(),
    };

    const innerContext: ITraceContext = {
      traceId: 'inner-trace',
      spanId: 'bbbbbbbb',
      startTime: Date.now(),
    };

    let outerResult: ITraceContext | undefined;
    let innerResult: ITraceContext | undefined;

    manager.run(outerContext, () => {
      outerResult = manager.getCurrent();

      manager.run(innerContext, () => {
        innerResult = manager.getCurrent();
      });
    });

    expect(outerResult).toEqual(outerContext);
    expect(innerResult).toEqual(innerContext);
  });

  it('should restore context after nested run completes', () => {
    const outerContext: ITraceContext = {
      traceId: 'outer-trace',
      spanId: 'aaaaaaaa',
      startTime: Date.now(),
    };

    const innerContext: ITraceContext = {
      traceId: 'inner-trace',
      spanId: 'bbbbbbbb',
      startTime: Date.now(),
    };

    let afterNested: ITraceContext | undefined;

    manager.run(outerContext, () => {
      manager.run(innerContext, () => {
        expect(manager.getCurrent()).toEqual(innerContext);
      });

      afterNested = manager.getCurrent();
    });

    expect(afterNested).toEqual(outerContext);
  });

  it('should handle errors in context runs', () => {
    const context: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    expect(() => {
      manager.run(context, () => {
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    // Context should be cleared after error
    expect(manager.getCurrent()).toBeUndefined();
  });

  it('should handle async errors in context runs', async () => {
    const context: ITraceContext = {
      traceId: 'test-trace',
      spanId: '12345678',
      startTime: Date.now(),
    };

    await expect(
      manager.runAsync(context, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      })
    ).rejects.toThrow('Async error');

    // Context should be cleared after error
    expect(manager.getCurrent()).toBeUndefined();
  });
});