import { describe, it, expect } from 'vitest';
import { DefaultTraceIdGenerator } from '../../../src/core/generators/trace-id.generator';

describe('DefaultTraceIdGenerator', () => {
  it('should generate a valid trace ID', () => {
    const generator = new DefaultTraceIdGenerator();
    const traceId = generator.generate();

    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe('string');
    expect(traceId.length).toBeGreaterThan(0);
    expect(traceId.length).toBeLessThanOrEqual(128);
  });

  it('should generate unique trace IDs', () => {
    const generator = new DefaultTraceIdGenerator();
    const traceId1 = generator.generate();
    const traceId2 = generator.generate();

    expect(traceId1).not.toBe(traceId2);
  });

  it('should validate a correct trace ID', () => {
    const generator = new DefaultTraceIdGenerator();
    const validTraceId = generator.generate();

    expect(generator.validate(validTraceId)).toBe(true);
  });

  it('should reject empty trace ID', () => {
    const generator = new DefaultTraceIdGenerator();

    expect(generator.validate('')).toBe(false);
  });

  it('should reject null/undefined trace ID', () => {
    const generator = new DefaultTraceIdGenerator();

    expect(generator.validate(null as any)).toBe(false);
    expect(generator.validate(undefined as any)).toBe(false);
  });

  it('should reject trace ID longer than 128 characters', () => {
    const generator = new DefaultTraceIdGenerator();
    const longTraceId = 'a'.repeat(129);

    expect(generator.validate(longTraceId)).toBe(false);
  });

  it('should accept trace ID of exactly 128 characters', () => {
    const generator = new DefaultTraceIdGenerator();
    const validLengthTraceId = 'a'.repeat(128);

    expect(generator.validate(validLengthTraceId)).toBe(true);
  });

  it('should generate UUID v4 format trace IDs by default', () => {
    const generator = new DefaultTraceIdGenerator();
    const traceId = generator.generate();

    // UUID v4 regex pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(traceId)).toBe(true);
  });

  it('should accept custom trace ID generator function', () => {
    const customGenerator = () => 'custom-trace-id-123';
    const generator = new DefaultTraceIdGenerator(customGenerator);

    expect(generator.generate()).toBe('custom-trace-id-123');
  });
});