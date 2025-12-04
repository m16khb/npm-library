# Research: Async Utils Library

## Retry with Exponential Backoff

**Decision**: Implement retry functionality inspired by p-retry with jitter support and AbortSignal integration.

**Rationale**:
- p-retry is industry standard with 20M+ weekly downloads
- Jitter prevents thundering herd in distributed systems
- AbortSignal provides modern cancellation support

**Alternatives considered**:
- Custom implementation without jitter (rejected: causes system overload)
- axios-retry (rejected: Axios-specific, not framework agnostic)
- async-retry (rejected: No longer maintained)

## Timeout Protection

**Decision**: Use AbortSignal-based timeout with Node.js native AbortSignal.timeout() where available.

**Rationale**:
- Native support in Node.js 16+ and modern browsers
- Zero external dependencies
- Consistent API with standard Web platform

**Alternatives considered**:
- p-timeout package (rejected: Additional dependency)
- Custom setTimeout implementation (rejected: Less robust)
- Promise.race with timeout (rejected: No cleanup mechanism)

## Concurrency Control

**Decision**: Implement p-limit style concurrency management with queue-based approach.

**Rationale**:
- Proven pattern with extensive production use
- Memory efficient with configurable queue limits
- Provides visibility into active/pending operations

**Alternatives considered**:
- Semaphore pattern (rejected: More complex, less flexible)
- Worker threads (rejected: Too heavy for simple concurrency control)
- Rate limiting only (rejected: Doesn't handle concurrency spikes)

## Module Architecture

**Decision**: Modular structure with individual modules for each feature.

**Rationale**:
- Enables tree-shaking - users only import what they need
- Easier maintenance and testing
- Clear separation of concerns

**Alternatives considered**:
- Monolithic module (rejected: Larger bundle size)
- Micro-package architecture (rejected: Too many dependencies)
- Plugin system (rejected: Over-engineering for this scope)

## TypeScript Patterns

**Decision**: Use strict mode with comprehensive type inference and utility types.

**Rationale**:
- Catch errors at compile time rather than runtime
- Better IDE support with autocomplete
- Self-documenting code

**Key patterns**:
- Generic utility types (Awaited, AsyncReturnType)
- Result type for error handling
- Discriminated unions for configuration

## Performance Optimizations

**Memory management**:
- WeakMap for abort controller storage
- Object pooling for frequent operations
- Proper cleanup in finally blocks

**Bundle optimization**:
- Named exports for tree-shaking
- Dual module output (ESM/CommonJS)
- Conditional exports in package.json

**Runtime performance**:
- Microtask scheduling for non-blocking delays
- Native APIs over polyfills where available
- Minimal overhead (< 1ms per operation)