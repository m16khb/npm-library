# Data Model: NestJS Global Exception Filter

## Core Interfaces

### Error Response Structure (RFC 7807)

```typescript
interface ProblemDetails {
  /** A URI reference that identifies the problem type */
  type: string;
  /** The HTTP status code */
  status: number;
  /** A short, human-readable summary of the problem */
  title: string;
  /** A human-readable explanation specific to this occurrence */
  detail?: string;
  /** A URI reference that identifies the specific occurrence */
  instance?: string;
  /** Timestamp when error occurred */
  timestamp?: string;
  /** Trace ID for request correlation */
  traceId?: string;
  /** Request ID for tracking */
  requestId?: string;
  /** Additional problem-specific details */
  [key: string]: any;
}

interface ValidationErrorDetails extends ProblemDetails {
  /** Field-level validation errors */
  errors: ValidationErrorItem[];
}

interface ValidationErrorItem {
  /** Field path (dot notation for nested objects) */
  field: string;
  /** Error code/message */
  code: string;
  /** Human-readable message */
  message: string;
  /** Invalid value that caused validation error */
  value?: any;
}
```

### Error Chain Processing

```typescript
interface ErrorChainNode {
  /** The error object */
  error: Error;
  /** Error type/class name */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace (environment dependent) */
  stack?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

interface ErrorChainResult {
  /** Root error */
  root: ErrorChainNode;
  /** All errors in the chain */
  chain: ErrorChainNode[];
  /** Chain depth */
  depth: number;
  /** Formatted messages */
  messages: string[];
  /** Has circular references */
  hasCircularRefs: boolean;
}
```

### Configuration

```typescript
interface ErrorFilterConfig {
  /** Enable/disable features */
  enabled: boolean;

  /** Environment-specific settings */
  environment: {
    /** Current environment (development, staging, production, test) */
    name: string;
    /** Include stack traces in response */
    includeStackTrace: boolean;
    /** Include error cause chain in response */
    includeCauseChain: boolean;
    /** Include internal error details */
    includeInternalDetails: boolean;
  };

  /** Response formatting */
  response: {
    /** Base URL for error type URIs */
    typeBaseUrl: string;
    /** Include timestamp in response */
    includeTimestamp: boolean;
    /** Include trace ID in response */
    includeTraceId: boolean;
    /** Custom response mapper */
    mapper?: (error: unknown, context: ExecutionContext) => ProblemDetails;
  };

  /** Logging configuration */
  logging: {
    /** Enable error logging */
    enabled: boolean;
    /** Default log level */
    level: 'error' | 'warn' | 'info' | 'debug';
    /** Custom logger service */
    service?: string;
    /** Log format (json, text) */
    format: 'json' | 'text';
  };

  /** Security settings */
  security: {
    /** Sanitize error messages */
    sanitizeMessages: boolean;
    /** Filter sensitive fields from request */
    filterSensitiveFields: boolean;
    /** Fields to filter */
    sensitiveFields: string[];
    /** Max error message length */
    maxMessageLength: number;
  };
}
```

### Execution Context

```typescript
interface ExecutionContext {
  /** HTTP request object */
  request: Request;
  /** HTTP response object */
  response: Response;
  /** Route handler metadata */
  handler: HandlerMetadata;
  /** Trace ID from request headers */
  traceId?: string;
  /** Request ID */
  requestId?: string;
  /** User information (if available) */
  user?: UserContext;
  /** Request path */
  path: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Query parameters */
  query: Record<string, string>;
}

interface HandlerMetadata {
  /** Handler class name */
  className: string;
  /** Method name */
  methodName: string;
  /** Controller name */
  controllerName: string;
  /** Route path */
  path: string;
  /** HTTP method */
  method: string;
  /** Handler parameters metadata */
  parameters?: ParameterMetadata[];
}

interface UserContext {
  /** User ID */
  id: string;
  /** User roles */
  roles: string[];
  /** Additional user metadata */
  [key: string]: any;
}

interface ParameterMetadata {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Parameter index */
  index: number;
  /** Parameter source (body, query, param) */
  source: string;
}
```

## Error Types

### Custom Error Classes

```typescript
class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly errors: ValidationErrorItem[]
  ) {
    super(message, 'VALIDATION_ERROR', 400, { errors });
  }
}

class BusinessError extends BaseError {
  constructor(
    message: string,
    code: string,
    metadata?: Record<string, any>
  ) {
    super(message, code, 422, metadata);
  }
}

class NotFoundError extends BaseError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
  }
}

class ConflictError extends BaseError {
  constructor(
    message: string,
    public readonly conflictId?: string
  ) {
    super(message, 'CONFLICT', 409, { conflictId });
  }
}
```

### HttpException Wrappers

```typescript
interface HttpExceptionDetails {
  status: number;
  message: string;
  error?: string;
  details?: any;
}

interface ParsedHttpException extends HttpExceptionDetails {
  /** Original HTTP exception */
  exception: HttpException;
  /** Response status code */
  statusCode: number;
  /** Response message */
  statusMessage: string;
  /** Response body */
  responseBody: any;
}
```