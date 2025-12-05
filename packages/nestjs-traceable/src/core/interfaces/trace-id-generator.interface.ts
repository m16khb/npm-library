/**
 * TraceId 생성기 인터페이스
 */
export interface ITraceIdGenerator {
  /**
   * 새로운 traceId를 생성한다.
   * @returns 1-128자 문자열
   */
  generate(): string;

  /**
   * 주어진 ID가 유효한 traceId인지 검증한다.
   * @param id 검증할 ID
   * @returns 유효성 여부
   */
  validate(id: string): boolean;
}

/**
 * SpanId 생성기 인터페이스
 */
export interface ISpanIdGenerator {
  /**
   * 새로운 spanId를 생성한다.
   * @returns 8자리 hex 문자열
   */
  generate(): string;

  /**
   * 주어진 ID가 유효한 spanId인지 검증한다.
   * @param id 검증할 ID
   * @returns 유효성 여부
   */
  validate(id: string): boolean;
}

/**
 * ID 생성기 옵션
 */
export interface IGeneratorOptions {
  /** 기본 접두사 */
  prefix?: string;

  /** 최소 길이 */
  minLength?: number;

  /** 최대 길이 */
  maxLength?: number;

  /** 허용된 문자 집합 */
  charset?: 'alphanumeric' | 'hex' | 'numeric' | 'alpha' | 'custom';

  /** 커스텀 문자 집합 (charset이 'custom'일 때 사용) */
  customCharset?: string;
}