import { randomUUID } from 'node:crypto';
import type { ITraceIdGenerator } from '../interfaces';

/**
 * 기본 TraceId 생성기
 * UUID v4 형식으로 traceId를 생성한다.
 */
export class DefaultTraceIdGenerator implements ITraceIdGenerator {
  private readonly generateFn: () => string;

  constructor(generateFn?: () => string) {
    this.generateFn = generateFn ?? this.generateUUID;
  }

  /**
   * 새로운 traceId를 생성한다.
   * @returns UUID v4 형식의 traceId
   */
  generate(): string {
    return this.generateFn();
  }

  /**
   * 주어진 ID가 유효한 traceId인지 검증한다.
   * @param id 검증할 ID
   * @returns 유효성 여부
   */
  validate(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // 길이 체크 (1-128자)
    if (id.length < 1 || id.length > 128) {
      return false;
    }

    return true;
  }

  /**
   * UUID v4를 생성한다.
   * @returns UUID v4 문자열
   */
  private generateUUID(): string {
    return randomUUID();
  }
}