# Data Model: Error Chain Processor Library

## Core Interfaces

### Error Chain Management

```typescript
interface ErrorChain {
  /** Root error in the chain */
  root: Error;
  /** Array of errors in chain (root first) */
  errors: Error[];
  /** Chain depth */
  depth: number;
  /** Processing timestamp */
  processedAt: Date;
  /** Processing duration in milliseconds */
  processingDuration?: number;
  /** Has circular references */
  hasCircularRefs: boolean;
}

interface ErrorChainNode {
  /** Original error object */
  error: Error;
  /** Processed error with metadata */
  processed: ProcessedError;
  /** Child error (if any) */
  child?: ErrorChainNode;
  /** Node depth in chain */
  depth: number;
  /** Processing timestamp */
  timestamp: Date;
}

interface ProcessedError {
  /** Error name */
  name: string;
  /** Error message */
  message: string;
  /** Stack trace (filtered based on environment) */
  stack?: string;
  /** Original error type */
  originalType: string;
  /** Metadata from error */
  metadata?: Record<string, any>;
  /** Child errors in chain */
  children?: ProcessedError[];
  /** Serialization-friendly version */
  serializable?: SerializedErrorChain;
}
```

### Circular Reference Detection

```typescript
interface CircularReferenceInfo {
  /** The circular reference error */
  error: Error;
  /** Where the cycle was detected */
  detectionPoint: string;
  /** Depth at which cycle was found */
  depth: number;
  /** Array of errors in cycle */
  cycle: Error[];
  /** Timestamp of detection */
  timestamp: Date;
}

interface DetectionState {
  /** WeakSet for tracking visited errors */
  visited: WeakSet<Error>;
  /** Maximum depth limit */
  maxDepth: number;
  /** Detection statistics */
  stats: DetectionStats;
}

interface DetectionStats {
  /** Total errors processed */
  total: number;
  /** Circular references detected */
  circularRefs: number;
  /** Max chain depth reached */
  maxDepthReached: boolean;
  /** Average processing time */
  avgProcessingTime: number;
  /** Memory efficiency with WeakSet */
  memoryEfficiency: 'high';
}
```

### Serialization Support

```typescript
interface SerializedErrorChain {
  /** Error name */
  name: string;
  /** Error message */
  message: string;
  /** Stack trace (if available) */
  stack?: string;
  /** Type of serialization marker */
  serializationType: 'safe' | 'circular';
  /** Serialized child errors */
  children?: SerializedErrorChain[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

interface SerializationOptions {
  /** Include stack traces in output */
  includeStackTrace: boolean;
  /** Environment ('development', 'production', 'test') */
  environment: string;
  /** Maximum depth for serialization */
  maxDepth: number;
  /** PII filtering enabled */
  filterPII: boolean;
  /** Custom serialization replacer function */
  replacer?: (key: string, value: any) => any;
}

interface SerializationResult {
  /** Serialized data */
  data: string;
  /** Processing time in milliseconds */
  duration: number;
  /** Size of serialized data in bytes */
  byteSize: number;
  /** Whether circular references were handled */
  hasCircularRefs: boolean;
}
```

### Stack Trace Models

```typescript
interface StackFrame {
  /** Line number in file */
  line: number;
  /** Column number */
  column: number;
  /** File name */
  filename: string;
  /** Function name */
  function: string;
  /** Source code line */
  lineContent: string;
  /** Module path */
  module: string;
  /** Call stack position */
  position: Position;
}

interface Position {
  line: number;
  column: number;
}

interface SourceMapInfo {
  /** Source map version */
  version: number;
 3
  /** Source map URLs */
  urls: string[];
  /** Source map content */
  mappings: SourceMapMapping[];
}

interface SourceMapMapping {
  /** Generated line number */
  generatedLine: number;
 3: 4;
  /** Original line number */
  originalLine: number;
 3: 4;
  /** Source map mapping */
  map: {
    source: SourcePosition;
    generated: GeneratedPosition;
  };
}
```

### Configuration

```typescript
interface ProcessingConfig {
  /** Maximum recursion depth for chain extraction */
  maxDepth: number;
  /** Enable/disable detailed stack traces */
  includeStackTrace: boolean;
  /** Environment context for formatting */
  environment: 'development' | 'staging' | 'production' | 'test';
  /** PII filtering settings */
  pii: PIIConfig;
  /** Serialization options */
  serialization: SerializationOptions;
  /** Performance monitoring */
  performance: PerformanceConfig;
}

interface PIIConfig {
  /** Enable PII filtering */
  enabled: boolean;
  /** Regex patterns for PII detection */
  patterns: PII[];
  /** Custom PII replacement function */
  replacer?: (value: string) => string;
  /** Fields to always filter */
  alwaysFilter: string[];
  /** Sensitive data patterns */
  sensitivePatterns: string[];
}

interface PerformanceConfig {
  /** Performance monitoring enabled */
  enabled: boolean;
  /** Slow operation threshold (ms) */
  slowThreshold: number;
  /** Large error chain threshold (depth) */
  largeChainThreshold: number;
  /** Memory usage threshold (bytes) */
  memoryThreshold: number;
  /** Collection of performance metrics */
  metrics: PerformanceMetric[];
}

interface PerformanceMetric {
  /** Metric name */
  name: string;
  /** Timestamp */
  timestamp: Date;
  /** Operation duration (ms) */
  duration: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

### Error Type Class Hierarchy

```typescript
abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;

    if (code) this.code = code;
    if (statusCode) this.statusCode = statusCode;
    if (context) this.context = context;
  }

  /** Get parent error in chain */
  get parent(): BaseError | null {
    return (this.cause instanceof BaseError) ? this.cause : null;
  }

  /** Set parent error */
  set parent(parent: BaseError | null): void {
    if (parent) {
      (this.cause as any).parent = parent;
    }
  }
}

class ValidationError extends BaseError {
  constructor(
    message: string,
    errors: ValidationErrorItem[],
    cause?: Error
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      { errors, cause }
    );
  }
}

class BusinessError extends BaseError {
  constructor(
    message: string,
    code: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(
      message,
      code,
      'BUSINESS_ERROR',
      422,
      { code, context, cause }
    );
  }
}

class CircularReferenceError extends BaseError {
  constructor(
    message: string,
    circularInfo: CircularReferenceInfo
  ) {
    super(
      message,
      'CIRCULAR_REFERENCE',
      409,
      {
        circularInfo,
        cause: circularInfo.error
      }
    );
  }
}
```

### Validation Error Items

```typescript
interface ValidationErrorItem {
  /** Field path (dot notation) */
  field: string;
  /** Error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Invalid value that caused error */
  value?: any;
  /** Path to property in object */
  property?: string;
  /** Additional context */
  context?: Record<string, any>;
}

interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (if any) */
  errors?: ValidationErrorItem[];
  /** Validated and filtered data */
  value?: any;
}

interface ValidationOptions {
  /** Validation rules to apply */
  rules: ValidationRule[];
  /** Strict validation mode */
  strict: boolean;
  /** Custom validation logic */
  customValidator?: (
    value: unknown,
    context: any
  ) => ValidationResult;
}
```

### Utility Types

```typescript
type ErrorOrUndefined = Error | undefined;
type ErrorChainOrUndefined = Error | undefined;

// Type guards
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function isErrorWithCause(error: unknown): error is Error & { cause: Error };
function isSerializableError(obj: unknown): obj is SerializedErrorChain;

// Utility types
type ExtractedErrorChain = {
  chain: Error[];
  depth: number;
  hasCircularRefs: boolean;
  processingTime: number;
};

type ErrorFilter<T extends Error = (
  error: T,
  context: ExecutionContext
) => boolean;

type ErrorProcessor<T extends Error = (
  error: T,
  options?: ProcessingConfig
) => ProcessedError;

type ErrorFormatter = (
  error: Error,
  options: StackTraceOptions
) => string;

type ErrorSerializer = (
  error: Error,
  options?: SerializationOptions
) => SerializationResult;
```