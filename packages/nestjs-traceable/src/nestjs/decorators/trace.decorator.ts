import {SetMetadata, UseInterceptors} from '@nestjs/common';
import {TraceInterceptor} from '../interceptors/trace.interceptor';
import {TRACE_METADATA_KEY, TRACEABLE_METADATA_KEY} from '../constants';

/**
 * 메서드 실행을 추적하는 데코레이터
 *
 * @param operationName 작업 이름 (선택적, 기본값: 메서드 이름)
 *
 * @example
 * ```typescript
 * class UserService {
 *   @Trace('find-user')
 *   async findById(id: string) {
 *     // 이 메서드 실행이 'find-user' span으로 추적됨
 *     return this.userRepository.findOne(id);
 *   }
 *
 *   @Trace() // 메서드 이름 'createUser'가 사용됨
 *   async createUser(data: CreateUserDto) {
 *     return this.userRepository.save(data);
 *   }
 * }
 * ```
 */
export function Trace(operationName?: string): MethodDecorator {
  return applyDecorators(
    SetMetadata(TRACE_METADATA_KEY, operationName),
    UseInterceptors(TraceInterceptor),
  );
}

/**
 * 클래스의 모든 메서드를 추적하는 데코레이터
 *
 * @example
 * ```typescript
 * @Traceable()
 * class OrderService {
 *   async createOrder(data: CreateOrderDto) {
 *     // 자동으로 추적됨
 *   }
 *
 *   async cancelOrder(id: string) {
 *     // 자동으로 추적됨
 *   }
 * }
 * ```
 */
export function Traceable(): ClassDecorator {
  return SetMetadata(TRACEABLE_METADATA_KEY, true);
}

/**
 * 여러 데코레이터를 조합하는 헬퍼 함수
 * NestJS 내부 함수지만 여기서 재구현
 */
function applyDecorators(...decorators: MethodDecorator[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    decorators.forEach(decorator => {
      decorator(target, propertyKey, descriptor);
    });
  };
}
