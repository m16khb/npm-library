import { randomBytes } from 'node:crypto';
import type { ISpanIdGenerator } from '../interfaces';

/**
 * 기본 SpanId 생성기
 * 8자리 hex 문자열로 spanId를 생성한다.
 */
export class DefaultSpanIdGenerator implements ISpanIdGenerator {
  private readonly generateFn: () => string;

  constructor(generateFn?: () => string) {
    this.generateFn = generateFn ?? this.generateRandomHex;
  }

  /**
   * 새로운 spanId를 생성한다.
   * @returns 8자리 hex 문자열
   */
  generate(): string {
    return this.generateFn();
  }

  /**
   * 주어진 ID가 유효한 spanId인지 검증한다.
   * @param id 검증할 ID
   * @returns 유효성 여부
   */
  validate(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // 길이 체크 (정확히 8자)
    if (id.length !== 8) {
      return false;
    }

    // 16진수 문자열 체크
    const hexRegex = /^[0-9a-fA-F]{8}$/;
    return hexRegex.test(id);
  }

  /**
   * 8바이트의 랜덤 값을 생성하고 hex로 변환한다.
   * @returns 8자리 hex 문자열
   */
  private generateRandomHex(): string {
    // 4바이트 랜덤 데이터 생성
    const buffer = randomBytes(4);
    return buffer.toString('hex').substring(0, 8);
  }
}