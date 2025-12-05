import { vi } from 'vitest';

// Global test setup
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
    randomBytes: (size: number) => {
      const buf = Buffer.alloc(size);
      buf.fill('0x41'); // Fill with 'A'
      return buf;
    },
  },
});