import { describe, it, expect } from 'vitest';
import { DefaultSpanIdGenerator } from '../../../src/core/generators/span-id.generator';

describe('DefaultSpanIdGenerator', () => {
  it('should generate an 8-character hex string', () => {
    const generator = new DefaultSpanIdGenerator();
    const spanId = generator.generate();

    expect(spanId).toBeDefined();
    expect(typeof spanId).toBe('string');
    expect(spanId).toHaveLength(8);
  });

  it('should generate valid hexadecimal characters only', () => {
    const generator = new DefaultSpanIdGenerator();
    const spanId = generator.generate();

    const hexRegex = /^[0-9a-f]{8}$/;
    expect(hexRegex.test(spanId)).toBe(true);
  });

  it('should generate unique span IDs', () => {
    const generator = new DefaultSpanIdGenerator();
    const spanId1 = generator.generate();
    const spanId2 = generator.generate();

    expect(spanId1).not.toBe(spanId2);
  });

  it('should validate a correct span ID', () => {
    const generator = new DefaultSpanIdGenerator();
    const validSpanId = generator.generate();

    expect(generator.validate(validSpanId)).toBe(true);
  });

  it('should validate uppercase hex span IDs', () => {
    const generator = new DefaultSpanIdGenerator();
    const uppercaseSpanId = 'ABCDEF12';

    expect(generator.validate(uppercaseSpanId)).toBe(true);
  });

  it('should reject non-hex characters', () => {
    const generator = new DefaultSpanIdGenerator();
    const invalidSpanId = 'ghijklmn';

    expect(generator.validate(invalidSpanId)).toBe(false);
  });

  it('should reject empty span ID', () => {
    const generator = new DefaultSpanIdGenerator();

    expect(generator.validate('')).toBe(false);
  });

  it('should reject null/undefined span ID', () => {
    const generator = new DefaultSpanIdGenerator();

    expect(generator.validate(null as any)).toBe(false);
    expect(generator.validate(undefined as any)).toBe(false);
  });

  it('should reject span IDs shorter than 8 characters', () => {
    const generator = new DefaultSpanIdGenerator();
    const shortSpanId = '1234567';

    expect(generator.validate(shortSpanId)).toBe(false);
  });

  it('should reject span IDs longer than 8 characters', () => {
    const generator = new DefaultSpanIdGenerator();
    const longSpanId = '123456789';

    expect(generator.validate(longSpanId)).toBe(false);
  });

  it('should generate different values across multiple calls', () => {
    const generator = new DefaultSpanIdGenerator();
    const spanIds = new Set();

    for (let i = 0; i < 1000; i++) {
      spanIds.add(generator.generate());
    }

    // With high probability, 1000 generations should produce unique values
    expect(spanIds.size).toBeGreaterThan(990);
  });

  it('should accept custom span ID generator function', () => {
    const customGenerator = () => '12345678';
    const generator = new DefaultSpanIdGenerator(customGenerator);

    expect(generator.generate()).toBe('12345678');
  });
});