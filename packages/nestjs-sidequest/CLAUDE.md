# @m16khb/nestjs-sidequest

## WHAT: Technical Stack

- **TypeScript**: 5.7+ (ES2022, strict mode)
- **Node.js**: 22.6.0+ (Sidequest.js requirement)
- **NestJS**: 10.x / 11.x compatible

### Required Dependencies (peerDependencies)

- `@nestjs/common` ^10.0.0 || ^11.0.0
- `@nestjs/core` ^10.0.0 || ^11.0.0
- `rxjs` ^7.0.0

### Optional Dependencies

- `nestjs-cls` ^6.0.0 - For CLS context propagation

## WHY: Purpose

NestJS integration wrapper for Sidequest.js, enabling database-native background job processing. Key benefits:

1. **No Redis Required**: Use your existing database (PostgreSQL, MySQL, MongoDB, SQLite)
2. **Transaction Consistency**: Atomic job creation with business logic
3. **NestJS Conventions**: Familiar decorator-based API (@Processor, @OnJob)
4. **Gradual Complexity**: Optional tracing, metrics, and CLS integration

## HOW: Architecture

### Core Components

```
src/
├── index.ts                    # Main exports
├── constants.ts                # DI tokens, metadata keys
├── core/
│   └── sidequest.adapter.ts    # Sidequest.js API wrapper
├── interfaces/
│   ├── module-options.interface.ts
│   ├── processor.interface.ts
│   └── queue.interface.ts
├── modules/
│   └── sidequest.module.ts     # forRoot/forRootAsync
├── decorators/
│   ├── processor.decorator.ts  # @Processor(name)
│   ├── on-job.decorator.ts     # @OnJob(name)
│   ├── retry.decorator.ts      # @Retry(opts)
│   ├── inject-queue.decorator.ts
│   ├── on-job-complete.decorator.ts
│   └── on-job-failed.decorator.ts
├── services/
│   ├── sidequest-engine.service.ts
│   ├── queue-registry.service.ts
│   └── processor-registry.service.ts
└── explorers/
    └── processor.explorer.ts   # @Processor class scanner
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Job Definition | Sidequest native (Job class inheritance) | Preserve Sidequest.js API |
| Queue API | Sidequest.build() wrapper | Familiar NestJS DI pattern |
| CLS Integration | Optional nestjs-cls | Don't force dependency |
| DI Tokens | Symbol-based | Collision prevention |
| Metadata Storage | Reflect.metadata | NestJS standard pattern |

### Module Registration Patterns

```typescript
// Synchronous
SidequestModule.forRoot({
  backend: { driver: '@sidequest/postgres-backend', config: '...' },
  queues: [{ name: 'default', concurrency: 10 }],
});

// Asynchronous (ConfigService)
SidequestModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    backend: { ... },
  }),
  inject: [ConfigService],
});
```

### Decorator Patterns

```typescript
@Processor('email')              // Class decorator: queue binding
export class EmailProcessor {
  @OnJob('SendEmail')            // Method decorator: job handler
  @Retry({ maxAttempts: 3 })     // Method decorator: retry policy
  async handle(data: any) { }

  @OnJobComplete()               // Event handler (all jobs)
  async onComplete(event) { }
}
```

## Commands

```bash
pnpm build      # Build package
pnpm typecheck  # Type check
pnpm test       # Run tests
pnpm dev        # Watch mode
pnpm clean      # Clean build artifacts
```

## Bundle Size

| Format | Size | gzip |
|--------|------|------|
| ESM | ~25 KB | ~8 KB |
| CJS | ~26 KB | ~8 KB |

## Test Structure

```
test/
├── setup.ts              # Global test setup
├── unit/                 # Unit tests
│   ├── decorators/
│   └── services/
└── integration/          # Integration tests
```

## Dependencies Matrix

| Package | Version | Type | Note |
|---------|---------|------|------|
| @nestjs/common | ^10.0.0 || ^11.0.0 | peer | Required |
| @nestjs/core | ^10.0.0 || ^11.0.0 | peer | Required |
| rxjs | ^7.0.0 | peer | Required |
| nestjs-cls | ^6.0.0 | optional peer | CLS integration |
