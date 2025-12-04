# Quick Start: Error Chain Processor Library

## Installation

```bash
npm install @org/error-chain-processor
# or
pnpm add @org/error-chain-processor
# or
yarn add @org/error-chain-processor
```

## Basic Usage

### 1. Individual Utilities

```typescript
import {
  errorChainProcessor,
  extractErrorChain,
  formatStackTrace,
  serialize
} from '@org/error-chain-processor';

// Extract error chain
const error1 = new Error('Database connection failed');
const error2 = new Error('Invalid API response', {
  cause: error1,
  code: 'DATABASE_ERROR'
});

const chain = extractErrorChain(error2);
console.log(`Depth: ${chain.depth}`);
// => Depth: 2

// Format stack trace by environment
const formatter = new StackTraceFormatter({
  environment: process.env.NODE_ENV
});

const stack = formatter.format(error1);
console.log(stack);

// Serialize with circular reference protection
const serializer = new ErrorSerializer({
  includeStackTrace: process.env.NODE_ENV === 'development',
  filterPII: true
});

const json = serializer.serialize(error2);
console.log(json);
```

### 2. High-Level Processor

```typescript
import { ErrorChainProcessor } from '@org/error-chain-processor';

const processor = new ErrorChainProcessor({
  maxDepth: 10,
  maxMemoryUsage: 'low',
  environment: process.env.NODE_ENV
});

// Process an error with all available context
const result = processor.process(error1);
console.log('Depth:', result.depth);
console.log('Processing time:', result.processingDuration, 'ms');
console.log('Has circular references:', result.hasCircularRefs);
console.log('Filtered stack:', result.root.stack);

// Extract cause chain
const rootCause = processor.getRootCause(error2);
console.log('Root cause:', rootCause.message);
```

## Error Chain Analysis

```typescript
// Deep error chain analysis
const processor = new ErrorChainProcessor({
  performance: {
    slowThreshold: 10,
    largeChainThreshold: 20,
    memoryEfficiency: 'high',
  }
});

const result = processor.analyzeError(error);

console.log('--- Error Analysis ---');
console.log('Processing time:', result.processingDuration, 'ms');
console.log('Original error:', result.root.message);
console.log('Errors in chain:', result.chain.length);
console.log('Has circular refs:', result.hasCircularRefs);
console.log('Max depth reached:', result.maxDepthReached);
```

## Environment-Specific Behavior

```typescript
// Development Environment
// Full details with source map
const devProcessor = new ErrorChainProcessor({
  environment: 'development',
  serialization: {
    includeStackTrace: true,
    environment: 'development'
  }
});

// Production Environment
const prodProcessor = new ErrorChainProcessor({
  environment: 'production',
  serialization: {
    includeStackTrace: false,
    environment: 'production',
    filterPII: true,
    maxDepth: 3
  }
});
```

## Data Models

### Create Custom Errors with Error Chains

```typescript
import {
  BaseError,
  BusinessError,
  ValidationError,
  NotFoundError
} from '@org/error-chain-processor'

// Wrap errors with additional context
const wrappedError = new BusinessError(
  'Order processing failed',
  'PROCESSING_FAILED',
  {
    orderId: 'ORD-123',
    timestamp: new Date(),
  }
);

wrappedError.cause = new Error('API timeout');
```

### Use in Async Error Handling

```typescript
import { handleErrorWithCause } from '@org/error-chain-processor';

async function processOrder(order: Order): Promise<Order> {
  try {
    await processOrderData(order.id, order.amount);
  } catch (error) {
    handleErrorWithCause(error, {
      context: {
        operation: 'order_processing',
        orderId: order.id
      },
      /*
      // Logging and alerting
    });
    }
    throw error;
  }
}

async function processOrderData(id: string, amount: number): Promise<OrderResult> {
  // Implementation details...
}
```

## Circular Reference Prevention

```typescript
const processor = new ErrorChainProcessor({
  maxDepth: 5  // Conservative limit for production
});

// Detect circular references
const circularError = new Error('Cyclic error detection', {
  cause: deepError
});

const detection = processor.detectCircularReferences(
  circularError
);
if (detection.hasCircularRefs) {
  console.log('Circular reference detected at:', detection.detectionPoint);
}

// Using WeakMap-based processors
const processor = new ErrorChainProcessor({
  memoryEfficiency: 'high'
});

// Process identical errors without memory leaks
for (const error of [error1, error2, error3]) {
  const result = processor.process(error);
  console.log(`Processed ${error.name}: ${result.processingDuration}ms`);
}
```

## Performance Optimizations

```typescript
// Object pooling for frequent operations
class Pool<T> {
  private pool: T[] = [];
  private index = 0;

  // Provide a reference counted
  private reset(): void {
    pool.length = [];
    index = 0;
  }

  // Example usage
  getProcessor(): ErrorChainProcessor {
    if (index >= this.pool.length) index = 0;
    return this.pool[index] || new ErrorChainProcessor();
  }
}
```

// Memoization for complex error chains
class ErrorMemoizer {
  private cache = new Map<string, ProcessedError> () => ProcessedError;

  getProcessedError(error: Error): ProcessedError | undefined {
    return this.cache.get(JSON.stringify(error)) || undefined;
  }

  cacheProcessedError(error: ProcessedError): void {
    this.cache.set(error.name, errorProcessor.process(error));
  }
}
```

## React Error Boundary

```typescript
import { ErrorChainProcessor } from '@org/error-chain-processor';

function ErrorBoundary({ children, fallback: ReactNode }) {
  const processor = new ErrorChainProcessor();

  const handleError = (error: unknown, errorInfo: ErrorInfo) => (
    <ErrorBoundaryComponent
      error={error}
      fallback={fallback}
      processor={processor}
    />
  );

  const [error, setErrorInfo] = useState(() => null);

  return (
    <ErrorBoundary error={setErrorInfo}>
      {children}
      fallback={fallback}
      error={error}
    />
  );
}
```

## TypeScript Advanced Patterns

### Generic Error Wrapper

```typescript
type ChainableError<T extends Error> = T & { cause?: ChainableError };

class ChainableError<T extends Error {
  constructor(
    message: string,
    cause?: ChainableError<Error>
  ) {
    super(message, cause);
    this.cause = cause instanceof Error ? { cause } : undefined;
  }
}

// Generic validation wrapper
class ValidationWrapper<T> implements ErrorWrapper<T> {
  process(error: unknown): T | never {
    if (error instanceof Error) return error;
    // Generic fallback for non-Error exceptions
    throw new Error(
      `Unexpected error: ${String(error)}`
    );
  }
}
```

### Error Chain Viewer CLI

```typescript
import { program } from 'commander';

const result = program.exitCode(
  process.argv.slice(2)
);

const processor = new ErrorChainProcessor();
const chains = process.argv.slice(3).map(arg => {
  const error = JSON.parse(arg);
  const chain = processor.extractChain(error);
  return {
    json: processor.serialize(error),
    chain: chain.map(e => processor.process(e))
  };
});

console.table(chains);
```

## Security Considerations

### PII Filtering Implementation

```typescript
const piiPatterns = [
  // Email patterns
  /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/gi,
  // Credit card patterns
  /(?:4[ -]*\d{4})\d{4}(?:\d{4}.\d{2}.\d{4})/,
  // API keys and secrets
  /(sk-[A-Za-z0-9._%+-]+@[\w-.]+/),
  // Social Security Numbers
  /\d{3}[ -]?\d{7}\d{4}\/d{1}\d{2}\d{2}\.\d{3}/g
];

const piiFilter = (error: unknown): string => {
  const cleaned = piiPatterns.reduce(
    (filtered, pattern) => filtered.replace(pattern, '[REDACTED]'),
    error.message || 'Unknown error'
  );
  return cleaned;
};
```

### Security Auditing Tools

```typescript
const securityAuditor = new SecurityAuditor({
  policies: PII_PATTERNS,
  alert_threshold: 10,
  custom_filters: CUSTOM_FILTERS
});

const auditResult = securityAuditor.auditError(errorChain);
if (auditResult.severity === 'HIGH') {
  // Trigger immediate alert
  securityAuditor.sendAlert(auditResult);
}
```

## Browser/Node.js Compatibility

### Universal API Design

```typescript
import { isNode } from './environment';

class UniversalProcessor {
  get currentStack(): string | undefined {
    if (isNode) {
      const error = new Error();
      return error.stack;
    }
    return undefined;
  }

  extractStackTrace(error: string | null {
    if (isNode) {
      return error.stack || 'No stack trace available';
    }

    // Browser environment
    if (typeof window !== 'undefined' && window.Error?.stack) {
      return window.Error.stack;
    }
    return null;
  }
}
```