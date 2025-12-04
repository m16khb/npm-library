# Quick Start: NestJS Global Exception Filter

## Installation

```bash
npm install @org/nestjs-error-filter
# or
pnpm add @org/nestjs-error-filter
# or
yarn add @org/nestjs-error-filter
```

## Basic Setup

### 1. Register the Global Filter

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { GlobalExceptionFilter } from '@org/nestjs-error-filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register the global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(3000);
}
bootstrap();
```

### 2. Configure the Filter (Optional)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ErrorFilterConfig, ErrorFilterModule } from '@org/nestjs-error-filter';

@Module({
  imports: [
    ErrorFilterModule.forRoot({
      enabled: true,
      environment: {
        name: process.env.NODE_ENV || 'development',
        includeStackTrace: true,
        includeCauseChain: true,
        includeInternalDetails: true,
      },
      response: {
        typeBaseUrl: 'https://api.example.com/errors',
        includeTimestamp: true,
        includeTraceId: true,
      },
      logging: {
        enabled: true,
        level: 'error',
        format: 'json',
      },
      security: {
        sanitizeMessages: true,
        filterSensitiveFields: true,
        sensitiveFields: ['password', 'token', 'secret'],
        maxMessageLength: 500,
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

### 3. Add Trace Context Middleware (Recommended)

```typescript
// src/trace-context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract trace ID from headers or generate new one
    req.traceId = req.headers['x-trace-id'] as string || randomUUID();

    // Add to response headers
    res.setHeader('X-Trace-ID', req.traceId);
    res.setHeader('X-Request-ID', randomUUID());

    next();
  }
}

// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TraceContextMiddleware)
      .forRoutes('*');
  }
}
```

## Error Response Format

All errors follow the RFC 7807 Problem Details standard:

```json
{
  "type": "https://api.example.com/errors/validation-error",
  "status": 400,
  "title": "Validation Failed",
  "detail": "Request validation failed",
  "instance": "https://api.example.com/users",
  "timestamp": "2024-12-04T10:30:00.000Z",
  "traceId": "trace-123e4567-89ab-cdef-0123456789ab",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Invalid email format",
      "value": "not-an-email"
    }
  ]
}
```

## Custom Error Types

### Create Custom Errors

```typescript
// src/errors/business.error.ts
import { BusinessError } from '@org/nestjs-error-filter';

export class UserNotFoundError extends BusinessError {
  constructor(userId: string) {
    super(
      `User with id '${userId}' not found`,
      'USER_NOT_FOUND',
      { userId }
    );
  }
}

export class InsufficientBalanceError extends BusinessError {
  constructor(current: number, required: number) {
    super(
      `Insufficient balance: ${current} < ${required}`,
      'INSUFFICIENT_BALANCE',
      { current, required }
    );
  }
}
```

### Use in Controllers

```typescript
// src/users/users.controller.ts
import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UserNotFoundError } from '../errors/business.error';

@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new UserNotFoundError(id);
    }

    return user;
  }
}
```

## Advanced Usage

### Custom Error Response Mapping

```typescript
// src/config/error-mapper.ts
import { ProblemDetails, ExecutionContext } from '@org/nestjs-error-filter';

export const customErrorMapper = (
  error: unknown,
  context: ExecutionContext
): ProblemDetails => {
  if (error instanceof CustomBusinessError) {
    return {
      type: `https://api.example.com/errors/${error.code}`,
      status: 422,
      title: 'Business Logic Error',
      detail: error.message,
      instance: context.path,
      timestamp: new Date().toISOString(),
      traceId: context.traceId,
      businessContext: error.metadata,
    };
  }

  // Fall back to default mapping
  return null;
};

// app.module.ts
ErrorFilterModule.forRoot({
  response: {
    mapper: customErrorMapper,
  },
});
```

### Environment-Specific Configuration

```typescript
// config/error-filter.config.ts
import { ErrorFilterConfig } from '@org/nestjs-error-filter';

export const getErrorFilterConfig = (): ErrorFilterConfig => {
  const env = process.env.NODE_ENV;

  const baseConfig = {
    enabled: true,
    environment: {
      name: env,
      includeStackTrace: env !== 'production',
      includeCauseChain: env !== 'production',
      includeInternalDetails: env !== 'production',
    },
    // ...
  };

  if (env === 'test') {
    return {
      ...baseConfig,
      environment: {
        ...baseConfig.environment,
        includeStackTrace: false,
        includeCauseChain: false,
      },
    };
  }

  return baseConfig;
};
```

### Integration with Custom Logger

```typescript
// src/logger/custom-logger.service.ts
import { Injectable } from '@nestjs/common';
import { LogContext } from '@org/nestjs-error-filter';

@Injectable()
export class CustomLoggerService {
  logError(error: any, context: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      traceId: context.traceId,
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      userId: context.user?.id,
      error: {
        name: error.name,
        stack: error.stack,
        cause: error.cause,
      },
    };

    // Send to logging service
    this.loggingService.log(logEntry);
  }
}

// app.module.ts
ErrorFilterModule.forRoot({
  logging: {
    service: 'CustomLoggerService',
  },
});
```

## Error Chain Example

```typescript
// src/services/payment.service.ts
async function processPayment(paymentData: PaymentData): Promise<PaymentResult> {
  try {
    // Validate payment data
    const validated = await this.validatePayment(paymentData);

    // Process with external provider
    const result = await this.chargeCard(validated);

    return result;
  } catch (error) {
    // Wrap error with additional context
    throw new PaymentProcessingError(
      'Failed to process payment',
      error instanceof Error ? error : new Error(String(error)),
      {
        paymentId: paymentData.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
      }
    );
  }
}

// Resulting error response:
{
  "type": "https://api.example.com/errors/payment-failed",
  "status": 500,
  "title": "Payment Processing Failed",
  "detail": "Failed to process payment",
  "instance": "/api/payments/123",
  "timestamp": "2024-12-04T10:30:00.000Z",
  "traceId": "trace-456789ab-cdef-0123-456789abcdef",
  "causes": [
    "PaymentProviderError: Card declined",
    "ValidationError: Invalid card number"
  ],
  "paymentId": "123",
  "amount": 99.99,
  "currency": "USD"
}
```

## Testing

### Unit Testing the Filter

```typescript
// test/filters/global-exception-filter.spec.ts
import { Test } from '@nestjs/testing';
import { GlobalExceptionFilter } from '@org/nestjs-error-filter';
import { ArgumentsHost } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockHost: jest.Mocked<ArgumentsHost>;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue({
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        }),
        getRequest: jest.fn().mockReturnValue({
          url: '/api/test',
          method: 'GET',
        }),
      }),
    } as any;
  });

  it('should handle HttpException correctly', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockHost.switchToHttp().getResponse().status).toHaveBeenCalledWith(404);
    expect(mockHost.switchToHttp().getResponse().json).toHaveBeenCalledWith({
      type: expect.any(String),
      status: 404,
      title: 'Not Found',
      detail: 'Not found',
      instance: '/api/test',
      timestamp: expect.any(String),
    });
  });

  it('should handle error with cause chain', () => {
    const rootError = new Error('Root cause');
    const wrappedError = new Error('Wrapped error', {
      cause: rootError,
    });

    filter.catch(wrappedError, mockHost);

    const response = mockHost.switchToHttp().getResponse().json.mock.calls[0][0];
    expect(response.causes).toBeDefined();
  });
});
```

### Integration Testing

```typescript
// test/integration/error-handling.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return proper error response for validation errors', async () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'invalid-email',
        age: 15,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          type: expect.any(String),
          status: 400,
          title: expect.any(String),
          detail: expect.any(String),
          errors: expect.any(Array),
        });
      });
  });
});
```

## Migration Guide

### From Custom Exception Filter

**Before:**
```typescript
@Catch()
export class CustomFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    response.status(status).json({
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**After:**
```typescript
import { GlobalExceptionFilter } from '@org/nestjs-error-filter';

// Remove custom filter, use the provided one
```

### From @nestjs/common Exceptions

**Before:**
```typescript
throw new BadRequestException('Invalid input');
```

**After (for more context):**
```typescript
import { ValidationError } from '@org/nestjs-error-filter';

throw new ValidationError('Invalid input', [
  {
    field: 'email',
    code: 'INVALID_FORMAT',
    message: 'Invalid email format',
    value: 'invalid',
  }
]);
```

## Best Practices

1. **Always use structured errors**: Create custom error classes for business logic
2. **Include relevant metadata**: Add context that helps with debugging
3. **Use proper HTTP status codes**: Match error types to appropriate status codes
4. **Log at the right level**: Use error level for system errors, warn for client errors
5. **Don't expose sensitive data**: Filter out passwords, tokens, and other sensitive information
6. **Include correlation IDs**: Always include traceId for request tracking
7. **Test error responses**: Ensure error responses are consistent and well-formed