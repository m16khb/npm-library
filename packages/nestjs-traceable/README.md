# @m16khb/nestjs-traceable

NestJS용 Traceable 데코레이터 라이브러리입니다. 메서드 실행 추적 및 로깅 기능을 제공합니다.

## 특징

- 🚀 간편한 메서드 추적 기능
- 📝 자동 로그 생성 (시작, 종료, 예외)
- 🔍 실행 시간 측정
- 🎯 사용자 정의 로거 지원
- 📦 제로 의존성 (NestJS 외)
- 💪 TypeScript 완전 지원

## 설치

```bash
npm install @m16khb/nestjs-traceable
# 또는
yarn add @m16khb/nestjs-traceable
# 또는
pnpm add @m16khb/nestjs-traceable
```

## 사용법

### 기본 사용

```typescript
import { Traceable } from '@m16khb/nestjs-traceable';

@Injectable()
export class UserService {
  @Traceable()
  async createUser(userData: CreateUserDto): Promise<User> {
    // 비즈니스 로직
    const user = await this.userRepository.save(userData);
    return user;
  }

  @Traceable('사용자 삭제')
  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
```

### 옵션 사용

```typescript
import { Traceable, TraceOptions } from '@m16khb/nestjs-traceable';

@Injectable()
export class OrderService {
  @Traceable({
    operation: '주문 처리',
    includeArgs: true,
    includeResult: false,
    logLevel: 'verbose',
    logExceptions: true
  })
  async processOrder(orderId: string): Promise<OrderResult> {
    // 주문 처리 로직
  }
}
```

### 전역 설정

```typescript
// app.module.ts
import { TraceableModule } from '@m16khb/nestjs-traceable';

@Module({
  imports: [
    TraceableModule.forRoot({
      global: true,
      defaultLogLevel: 'info',
      logExceptions: true
    })
  ],
  // ...
})
export class AppModule {}
```

### 커스텀 로거 사용

```typescript
import { TraceableModule, CustomLogger } from '@m16khb/nestjs-traceable';

@Injectable()
export class CustomTraceLogger implements CustomLogger {
  logStart(operation: string, args?: any[]): void {
    console.log(`[START] ${operation}`, args);
  }

  logSuccess(operation: string, duration: number, result?: any): void {
    console.log(`[SUCCESS] ${operation} (${duration}ms)`, result);
  }

  logException(operation: string, error: Error, duration: number): void {
    console.error(`[ERROR] ${operation} (${duration}ms)`, error);
  }
}

// module.ts
@Module({
  imports: [
    TraceableModule.forRoot({
      logger: new CustomTraceLogger()
    })
  ]
})
export class AppModule {}
```

## API

### Traceable 데코레이터

메서드 실행을 추적하는 데코레이터입니다.

```typescript
@Traceable(operation?: string | TraceOptions)
```

#### 파라미터

- `operation?`: string | TraceOptions
  - string: 추적할 작업 이름
  - TraceOptions: 상세 옵션

#### TraceOptions

```typescript
interface TraceOptions {
  operation?: string;           // 작업 이름
  includeArgs?: boolean;        // 인자 로깅 여부 (기본값: false)
  includeResult?: boolean;      // 결과 로깅 여부 (기본값: false)
  logLevel?: LogLevel;          // 로그 레벨 (기본값: 'info')
  logExceptions?: boolean;      // 예외 로깅 여부 (기본값: true)
  logger?: CustomLogger;        // 커스텀 로거
}
```

### TraceableModule

Traceable 기능을 위한 NestJS 모듈입니다.

```typescript
TraceableModule.forRoot(options?: TraceableModuleOptions)
```

#### TraceableModuleOptions

```typescript
interface TraceableModuleOptions {
  global?: boolean;              // 전역 모듈 여부 (기본값: true)
  defaultLogLevel?: LogLevel;    // 기본 로그 레벨 (기본값: 'info')
  logExceptions?: boolean;       // 전역 예외 로깅 여부 (기본값: true)
  logger?: CustomLogger;         // 전역 커스텀 로거
}
```

## 라이선스

MIT