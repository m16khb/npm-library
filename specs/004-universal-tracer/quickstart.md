# Quickstart Guide: Universal Trace Context Library

## Installation

```bash
# Core library (always required)
npm install @m16khb/universal-tracer

# Optional integrations (install as needed)
npm install winston @m16khb/universal-tracer/winston
npm install express @m16khb/universal-tracer/express
npm install fastify @m16khb/universal-tracer/fastify
npm install bullmq @m16khb/universal-tracer/bullmq
npm install typeorm @m16khb/universal-tracer/typeorm
```

## Basic Setup

### 1. Initialize Tracer

```typescript
import { Tracer } from '@m16khb/universal-tracer';

// Create tracer instance
const tracer = new Tracer({
  serviceName: 'my-service',
  sampling: {
    enabled: true,
    rate: 0.1 // Sample 10% of requests
  }
});
```

### 2. Add Winston Integration (Zero Code Changes)

```typescript
import { winstonIntegration } from '@m16khb/universal-tracer/winston';

// Enable automatic trace ID injection in all Winston logs
tracer.use(winstonIntegration({
  fieldName: 'traceId',        // Default field name
  includeCorrelationId: true    // Include correlation ID if available
}));

// Your existing logger - no changes needed!
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Logs will now automatically include traceId:
logger.info('Processing request');
// Output: { "message": "Processing request", "traceId": "0194fdc2-fa24-7000-8b0a-4b66944c73a8" }
```

### 3. Add HTTP Middleware

```typescript
import { expressIntegration } from '@m16khb/universal-tracer/express';
import express from 'express';

const app = express();

// Enable automatic trace extraction and injection
tracer.use(expressIntegration({
  framework: 'express',
  generateOnMissing: true,  // Create trace if not present
  skipPaths: ['/health', '/metrics']  // Skip certain paths
}));

app.use(express.json());

// Your routes work as normal - trace context is available automatically
app.get('/api/users', async (req, res) => {
  // Trace context is automatically available
  const traceId = tracer.current?.traceId;

  // All logs include trace ID automatically
  logger.info('Fetching users', { userId: req.query.id });

  res.json({ users: [] });
});
```

## Advanced Usage

### Manual Trace Context Management

```typescript
// Start a new trace
const trace = tracer.start({
  metadata: { userId: '123', operation: 'batch-process' }
});

// Run code within trace context
const result = tracer.run(trace, () => {
  // All operations here have access to trace context
  logger.info('Starting batch processing');

  // Nested operations
  return processBatch();
});

// Continue an existing trace from headers
const incomingHeaders = {
  'traceparent': '00-0194fdc2fa2470008b0a4b66944c73a8-0194fdc2fa2470008b0a4b66944c73a9-01'
};

const existingTrace = tracer.extract(incomingHeaders);
if (existingTrace) {
  tracer.run(existingTrace, () => {
    logger.info('Continuing trace from upstream service');
  });
}
```

### BullMQ Job Processing

```typescript
import { BullMQIntegration } from '@m16khb/universal-tracer/bullmq';
import { Worker } from 'bullmq';

// Enable BullMQ integration
tracer.use(new BullMQIntegration({
  dataKey: 'trace',           // Job data field for trace
  propagateToChildren: true,  // Auto-propagate to child jobs
  includeJobMetadata: true    // Include job info in trace
}));

// Create worker - trace context is automatically handled
const worker = new Worker('email-queue', async (job) => {
  // Trace context is automatically available from job data
  logger.info('Processing email job', {
    template: job.data.template,
    recipient: job.data.recipient
  });

  // Child jobs automatically inherit trace context
  await sendNotificationQueue.add('notify-admin', {
    reason: 'email-sent'
  });
});
```

### TypeORM Query Logging

```typescript
import { TypeORMIntegration } from '@m16khb/universal-tracer/typeorm';
import { DataSource } from 'typeorm';

// Enable TypeORM integration
tracer.use(new TypeORMIntegration({
  logger: {
    logQueries: true,          // Log all queries
    logSlowQueries: true,      // Log slow queries
    slowQueryTime: 1000       // Threshold in ms
  }
}));

// Your regular TypeORM setup - queries will include trace ID
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  database: 'myapp',
  entities: [User],
  logging: true
});

// Queries will automatically include trace context in logs
const users = await dataSource.getRepository(User).find();
// Log output: { "query": "SELECT * FROM users", "traceId": "..." }
```

### Service-to-Service Communication

```typescript
import axios from 'axios';

// Create HTTP client with automatic trace propagation
const apiClient = axios.create();

// Request interceptor - inject trace headers
apiClient.interceptors.request.use((config) => {
  const trace = tracer.current;
  if (trace) {
    const headers: Record<string, string> = {};
    tracer.inject(trace, headers);

    // Add headers to outgoing request
    config.headers = {
      ...config.headers,
      ...headers
    };
  }
  return config;
});

// Usage - trace headers are automatically added
const response = await apiClient.get('https://api.example.com/users');
```

### Custom Integration

```typescript
import { Integration } from '@m16khb/universal-tracer';

class CustomIntegration implements Integration {
  name = 'custom-cron';
  version = '1.0.0';

  async initialize(tracer: Tracer) {
    // Wrap your existing logic
    const originalHandler = cronJob.handler;

    cronJob.handler = async (...args: any[]) => {
      // Create trace context for cron job
      const trace = tracer.start({
        metadata: {
          cronJob: cronJob.name,
          schedule: cronJob.schedule
        }
      });

      // Execute within trace context
      return tracer.run(trace, () => {
        return originalHandler.apply(cronJob, args);
      });
    };
  }
}

// Register custom integration
tracer.use(new CustomIntegration());
```

## Configuration Options

### Sampling Strategy

```typescript
const tracer = new Tracer({
  serviceName: 'api-service',
  sampling: {
    enabled: true,
    rate: 0.1,        // 10% sampling rate
    minRate: 0.01     // Always sample at least 1%
  }
});
```

### Custom Headers

```typescript
const tracer = new Tracer({
  serviceName: 'api-service',
  headerNames: {
    traceParent: 'x-trace-id',
    traceState: 'x-trace-state',
    correlationId: 'x-request-id'
  }
});
```

### Performance Tuning

```typescript
const tracer = new Tracer({
  serviceName: 'high-traffic-service',
  performance: {
    maxContextDepth: 500,      // Limit nesting depth
    contextCacheSize: 5000,    // Increase cache size
    cleanupInterval: 10000     // Cleanup every 10 seconds
  }
});
```

## Best Practices

### 1. Early Initialization
Initialize the tracer as early as possible in your application:

```typescript
// At the very top of your application
const tracer = new Tracer({
  serviceName: process.env.SERVICE_NAME || 'unknown'
});

// Register integrations before any other setup
tracer.use(winstonIntegration());
tracer.use(expressIntegration());
```

### 2. Service Naming
Use meaningful service names that help identify the source:

```typescript
const tracer = new Tracer({
  serviceName: `${process.env.SERVICE_NAME}-${process.env.ENVIRONMENT}`,
  // e.g., "user-api-production"
});
```

### 3. Structured Logging
Use structured logging with trace IDs for better observability:

```typescript
// Good - structured with context
logger.info('User login successful', {
  userId: user.id,
  method: 'oauth',
  traceId: tracer.current?.traceId  // Added automatically, but explicit is OK
});

// Avoid - unstructured
logger.info(`User ${user.id} logged in`);
```

### 4. Error Handling
Always include trace context in error handling:

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request failed', {
    error: err.message,
    stack: err.stack,
    path: req.path
    // traceId automatically included
  });

  res.status(500).json({
    error: 'Internal server error',
    traceId: tracer.current?.traceId
  });
});
```

### 5. Background Jobs
Ensure background jobs maintain trace context:

```typescript
// BullMQ jobs automatically handle this
// For custom async operations:
async function processWithTrace<T>(operation: () => Promise<T>): Promise<T> {
  const trace = tracer.current || tracer.start();

  return tracer.run(trace, operation);
}
```

## Troubleshooting

### Missing Trace IDs
1. Check tracer initialization order
2. Verify integrations are registered before use
3. Enable debug mode: `new Tracer({ debug: true })`

### Performance Issues
1. Adjust sampling rate if overhead is high
2. Consider context cache size for high traffic
3. Monitor memory usage with metrics

### Context Loss
1. Ensure async/await is used consistently
2. Check for setTimeout/setInterval usage
3. Verify third-party libraries maintain context

## Example: Complete Service Setup

```typescript
import { Tracer } from '@m16khb/universal-tracer';
import { winstonIntegration } from '@m16khb/universal-tracer/winston';
import { expressIntegration } from '@m16khb/universal-tracer/express';
import express from 'express';
import winston from 'winston';

// 1. Initialize tracer
const tracer = new Tracer({
  serviceName: 'user-service',
  sampling: { rate: 0.1 }
});

// 2. Setup integrations
tracer.use(winstonIntegration());
tracer.use(expressIntegration({
  skipPaths: ['/health']
}));

// 3. Setup logger (unchanged)
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// 4. Setup express app
const app = express();
app.use(express.json());

// 5. Routes - trace context automatically available
app.get('/users/:id', async (req, res) => {
  logger.info('Fetching user', { userId: req.params.id });

  try {
    const user = await userService.findById(req.params.id);

    // External call automatically includes trace headers
    const analytics = await analyticsClient.track('user_viewed', {
      userId: user.id
    });

    res.json(user);
  } catch (error) {
    logger.error('Failed to fetch user', {
      error: error.message,
      userId: req.params.id
    });

    res.status(500).json({
      error: 'Internal server error',
      traceId: tracer.current?.traceId
    });
  }
});

// 6. Error middleware
app.use((err: Error, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    error: 'Internal server error',
    traceId: tracer.current?.traceId
  });
});

app.listen(3000, () => {
  logger.info('Service started on port 3000');
});
```

That's it! Your service now has complete trace context propagation with minimal setup.