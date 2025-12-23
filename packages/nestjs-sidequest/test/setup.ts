import 'reflect-metadata';

// Mock crypto.randomUUID in test environment
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
  },
});
