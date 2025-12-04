# Data Model: Universal Trace Context Library

**Created**: 2025-12-04
**Feature**: 004-universal-tracer

## Core Entities

### TraceContext

Central entity that manages trace information within CLS.

```typescript
interface TraceContext {
  // Primary trace identifier
  traceId: string;

  // Parent span ID for nested operations
  parentSpanId?: string;

  // Current span identifier
  spanId: string;

  // Sampling decision
  sampled: boolean;

  // Trace flags (debugging, etc.)
  flags: number;

  // Vendor-specific data (tracestate)
  vendorData?: Map<string, string>;

  // Creation timestamp
  createdAt: Date;

  // Metadata for additional context
  metadata?: Record<string, unknown>;
}
```

### Tracer

Main API interface for trace management.

```typescript
class Tracer {
  // Core configuration
  readonly config: TracerConfig;

  // Current trace context
  get current(): TraceContext | undefined;

  // Start new trace
  start(context?: Partial<TraceContext>): TraceContext;

  // Continue existing trace
  continue(traceId: string, parentSpanId?: string): TraceContext;

  // Execute with trace context
  run<T>(context: TraceContext, fn: () => T): T;

  // Extract trace from incoming headers
  extract(headers: Record<string, string>): TraceContext | null;

  // Inject trace into outgoing headers
  inject(context: TraceContext, headers: Record<string, string>): void;

  // Register integration
  use(integration: Integration): this;
}
```

### TracerConfig

Configuration options for the tracer.

```typescript
interface TracerConfig {
  // Service name for trace identification
  serviceName: string;

  // Custom header names (optional)
  headerNames?: {
    traceParent?: string;
    traceState?: string;
    correlationId?: string;
  };

  // Sampling configuration
  sampling?: {
    enabled: boolean;
    rate: number; // 0.0 to 1.0
    minRate?: number; // Minimum guaranteed rate
  };

  // Performance settings
  performance?: {
    maxContextDepth?: number;
    contextCacheSize?: number;
    cleanupInterval?: number;
  };

  // Debug mode
  debug?: boolean;
}
```

## Integration Entities

### Integration

Base interface for all framework integrations.

```typescript
interface Integration {
  readonly name: string;
  readonly version: string;
  readonly dependencies?: string[];

  // Initialize integration with tracer
  initialize(tracer: Tracer): void | Promise<void>;

  // Cleanup resources
  destroy?(): void | Promise<void>;
}
```

### WinstonIntegration

Winston logger integration configuration.

```typescript
interface WinstonIntegration extends Integration {
  // Logger instance or factory
  logger?: winston.Logger | (() => winston.Logger);

  // Custom trace ID field name
  fieldName?: string;

  // Add correlation ID if available
  includeCorrelationId?: boolean;

  // Format options
  format?: {
    json?: boolean;
    colorize?: boolean;
    timestamp?: boolean;
  };
}
```

### HttpIntegration

HTTP middleware integration (Express/Fastify).

```typescript
interface HttpIntegration extends Integration {
  // Framework type
  framework: 'express' | 'fastify' | 'generic';

  // Header extraction options
  headers?: {
    incoming?: string[];
    outgoing?: string[];
  };

  // Generate new trace if not present
  generateOnMissing?: boolean;

  // Skip paths (regex or string array)
  skipPaths?: Array<string | RegExp>;
}
```

### BullMQIntegration

BullMQ job processing integration.

```typescript
interface BullMQIntegration extends Integration {
  // Job data key for trace context
  dataKey?: string;

  // Propagate to child jobs
  propagateToChildren?: boolean;

  // Include job metadata in trace
  includeJobMetadata?: boolean;
}
```

### TypeORMIntegration

TypeORM logger integration.

```typescript
interface TypeORMIntegration extends Integration {
  // Logger options
  logger?: {
    logQueries?: boolean;
    logSlowQueries?: boolean;
    slowQueryTime?: number;
  };

  // Custom query formatter
  formatQuery?: (query: string, parameters?: unknown[]) => string;
}
```

## Data Flow

### Trace Lifecycle

1. **Initialization**: Trace created or extracted from incoming request
2. **Propagation**: Trace context automatically flows through async operations
3. **Logging**: Winston automatically includes trace ID in all logs
4. **Outbound**: Trace context injected into HTTP headers or job data
5. **Completion**: Trace context cleaned up when operation completes

### Context Storage

```typescript
// Internal CLS storage structure
interface CLSStorage {
  // Current trace context
  trace?: TraceContext;

  // Stack of parent spans for nested operations
  spanStack: SpanInfo[];

  // Performance metrics
  metrics: {
    operations: number;
    startTime: number;
    memoryUsage: number;
  };
}
```

### HTTP Header Mapping

```typescript
interface HeaderMapping {
  // Incoming headers to extract
  extract: {
    traceParent: string;      // Default: 'traceparent'
    traceState: string;       // Default: 'tracestate'
    b3TraceId: string;        // Default: 'x-b3-traceid'
    b3SpanId: string;         // Default: 'x-b3-spanid'
    b3ParentSpanId: string;   // Default: 'x-b3-parentspanid'
    b3Sampled: string;        // Default: 'x-b3-sampled'
    correlationId: string;    // Default: 'x-correlation-id'
  };

  // Outgoing headers to inject
  inject: {
    traceParent: string;      // Default: 'traceparent'
    traceState: string;       // Default: 'tracestate'
    b3TraceId: string;        // Default: 'x-b3-traceid'
    b3SpanId: string;         // Default: 'x-b3-spanid'
    b3Sampled: string;        // Default: 'x-b3-sampled'
    correlationId: string;    // Default: 'x-correlation-id'
  };
}
```

## Validation Rules

### Trace ID Validation

- Format: UUID v7 (time-ordered) or W3C traceparent format
- Length: 32 characters (hex) for W3C, 36 for UUID
- Characters: Hexadecimal (0-9, a-f) or UUID format
- Required fields: traceId, spanId

### Header Validation

- traceparent: Must match W3C regex `^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$`
- tracestate: Key-value pairs with specific character restrictions
- B3 headers: Hexadecimal strings of specific lengths

### Configuration Validation

- serviceName: Required, non-empty string
- sampling.rate: Number between 0 and 1
- performance.maxContextDepth: Positive integer
- headerNames: Valid HTTP header names (no spaces, special chars)

## Error Handling

### Error Types

```typescript
class TraceError extends Error {
  constructor(
    message: string,
    public readonly code: TraceErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TraceError';
  }
}

enum TraceErrorCode {
  INVALID_TRACE_ID = 'INVALID_TRACE_ID',
  CONTEXT_NOT_FOUND = 'CONTEXT_NOT_FOUND',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  INJECTION_FAILED = 'INJECTION_FAILED',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}
```

## Performance Metrics

### Tracked Metrics

- Operation count per trace
- Memory usage per context
- Context lifecycle duration
- Integration-specific metrics
- Error rates and types

### Metric Collection

```typescript
interface TraceMetrics {
  // Total operations traced
  totalOperations: number;

  // Average operations per trace
  avgOperationsPerTrace: number;

  // Current active traces
  activeTraces: number;

  // Memory usage
  memoryUsage: {
    total: number;
    perTrace: number;
    peak: number;
  };

  // Performance
  performance: {
    avgExtractionTime: number;
    avgInjectionTime: number;
    avgContextAccess: number;
  };

  // Errors
  errors: {
    extractionFailures: number;
    injectionFailures: number;
    contextErrors: number;
  };
}
```