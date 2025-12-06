/**
 * Error 처리 관련 순수 함수 유틸리티
 *
 * TraceableLogger 내부에서 사용하는 에러 처리 헬퍼
 * SOLID 원칙과 Tree-shaking을 고려한 순수 함수 설계
 */

/**
 * Error 객체에서 안전하게 메시지를 추출
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Error 객체에서 스택 트레이스를 포함한 상세 정보를 추출
 */
export function getErrorDetails(error: unknown): {
  message: string;
  stack?: string | undefined;
  name?: string | undefined;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    stack: undefined,
    name: undefined,
  };
}

/**
 * 에러 체인의 전체 메시지를 추출 (ES2022 Error.cause 지원)
 *
 * @example
 * ```typescript
 * const inner = new Error('DB connection failed');
 * const outer = new Error('User fetch failed', { cause: inner });
 * getErrorChain(outer);
 * // "User fetch failed → DB connection failed"
 * ```
 */
export function getErrorChain(error: unknown): string {
  if (!(error instanceof Error)) {
    return typeof error === 'string' ? error : 'Unknown error';
  }

  const messages: string[] = [error.message];
  let current: unknown = error.cause;

  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }

  // cause가 Error가 아닌 다른 값일 경우 추가
  if (current !== undefined && current !== null) {
    messages.push(String(current));
  }

  return messages.join(' → ');
}

/**
 * 에러 체인의 최초 원인(root cause)을 반환
 *
 * @example
 * ```typescript
 * const root = new Error('Connection timeout');
 * const middle = new Error('Query failed', { cause: root });
 * const outer = new Error('User fetch failed', { cause: middle });
 * getRootCause(outer); // root Error 객체 반환
 * ```
 */
export function getRootCause(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  let current: unknown = error;

  while (current instanceof Error && current.cause !== undefined) {
    current = current.cause;
  }

  return current;
}

/**
 * cause를 포함한 전체 에러 상세 정보를 추출
 */
export function getFullErrorDetails(error: unknown): {
  message: string;
  stack?: string | undefined;
  name?: string | undefined;
  chain: string;
  rootCause?:
    | {
        message: string;
        name?: string | undefined;
      }
    | undefined;
  depth: number;
} {
  const basicDetails = getErrorDetails(error);
  const chain = getErrorChain(error);
  const rootCause = getRootCause(error);

  // 에러 체인 깊이 계산
  let depth = 0;
  if (error instanceof Error) {
    let current: unknown = error;
    while (current instanceof Error) {
      depth++;
      current = current.cause;
    }
  }

  const rootCauseDetails =
    rootCause instanceof Error ? {message: rootCause.message, name: rootCause.name} : undefined;

  return {
    ...basicDetails,
    chain,
    rootCause: rootCauseDetails,
    depth,
  };
}

/**
 * 로깅을 위한 오류 메시지와 스택 트레이스를 형식화
 */
export function formatErrorForLogging(
  error: unknown,
  context?: string | undefined,
): {
  message: string;
  chain: string;
  stack?: string | undefined;
  context?: string | undefined;
  rootCause?: string | undefined;
} {
  const fullDetails = getFullErrorDetails(error);

  return {
    message: fullDetails.message,
    chain: fullDetails.chain,
    stack: fullDetails.stack,
    context,
    rootCause: fullDetails.rootCause?.message,
  };
}
