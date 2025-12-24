# npm-library

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.14.2-orange.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-latest-blue.svg)](https://turbo.build/)

[English](#) | [한국어](https://github.com/m16khb/npm-library/blob/main/README.ko.md)

npm library collection monorepo managed with pnpm workspace and Turborepo.

## Packages

| Package                                                     | Version                                                                                                                         | Description                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [@m16khb/nestjs-async-utils](./packages/nestjs-async-utils) | [![npm](https://img.shields.io/npm/v/@m16khb/nestjs-async-utils.svg)](https://www.npmjs.com/package/@m16khb/nestjs-async-utils) | NestJS async operation control decorators (@Retryable, @Timeout, @ConcurrencyLimit)    |
| [@m16khb/nestjs-traceable](./packages/nestjs-traceable)     | [![npm](https://img.shields.io/npm/v/@m16khb/nestjs-traceable.svg)](https://www.npmjs.com/package/@m16khb/nestjs-traceable)     | TraceId-based distributed tracing library for NestJS                                   |
| [@m16khb/nestjs-sidequest](./packages/nestjs-sidequest)     | [![npm](https://img.shields.io/npm/v/@m16khb/nestjs-sidequest.svg)](https://www.npmjs.com/package/@m16khb/nestjs-sidequest)     | NestJS integration for Sidequest.js - Database-native background job processing (LGPL) |

## Tech Stack

- **Package Manager**: pnpm 9.14.2 (workspace)
- **Build System**: Turborepo
- **Language**: TypeScript 5.7+ (ES2022, ESM)
- **Version Management**: Changesets

## Structure

```
npm-library/
├── packages/              # Individual library packages
│   ├── nestjs-async-utils/   # NestJS async utility decorators
│   ├── nestjs-traceable/     # NestJS traceId-based distributed tracing
│   └── nestjs-sidequest/     # NestJS Sidequest.js integration (DB-based job queue)
├── specs/                 # Feature specification documents
├── docs/                  # Common documentation
├── turbo.json            # Turborepo configuration
├── tsconfig.base.json    # Shared TypeScript configuration
└── pnpm-workspace.yaml   # pnpm workspace configuration
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode (watch)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## Publishing

```bash
# Record changes
pnpm changeset

# Version and publish
pnpm release
```

## Requirements

- Node.js >= 20.0.0
- pnpm >= 9.0.0

## License

MIT
