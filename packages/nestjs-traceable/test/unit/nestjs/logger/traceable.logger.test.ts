import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TraceableLogger } from '../../../../src/nestjs/logger/traceable.logger';

describe('TraceableLogger', () => {
  let logger: TraceableLogger;
  let mockWinstonLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    verbose: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockWinstonLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      log: vi.fn(),
    };

    // TraceableLogger는 @Optional() @Inject(WINSTON_MODULE_PROVIDER) 데코레이터를 사용하므로
    // 직접 생성자에 mock을 전달
    logger = new TraceableLogger(mockWinstonLogger as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setContext / child', () => {
    it('setContext()는 새로운 인스턴스를 반환한다', () => {
      const childLogger = logger.setContext('TestService');
      expect(childLogger).not.toBe(logger);
      expect(childLogger).toBeInstanceOf(TraceableLogger);
    });

    it('child()는 컨텍스트가 설정된 새 인스턴스를 반환한다', () => {
      const childLogger = logger.child('ChildService');
      childLogger.log('테스트 메시지');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message: '테스트 메시지',
        context: 'ChildService',
      });
    });

    it('원본 로거의 컨텍스트는 변경되지 않는다', () => {
      logger.setContext('OriginalContext');
      const childLogger = logger.child('ChildContext');

      childLogger.log('자식 메시지');
      logger.log('원본 메시지');

      expect(mockWinstonLogger.info).toHaveBeenCalledTimes(2);
      // 자식 로거의 컨텍스트
      expect(mockWinstonLogger.info).toHaveBeenNthCalledWith(1, {
        message: '자식 메시지',
        context: 'ChildContext',
      });
    });
  });

  describe('log()', () => {
    it('기본 메시지를 info 레벨로 출력한다', () => {
      logger.log('테스트 메시지');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message: '테스트 메시지',
        context: undefined,
      });
    });

    it('메타데이터와 함께 출력한다', () => {
      logger.log('결제 완료', { orderId: '123', amount: 10000 });

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message: '결제 완료',
        context: undefined,
        orderId: '123',
        amount: 10000,
      });
    });

    it('컨텍스트가 설정된 경우 포함하여 출력한다', () => {
      const contextLogger = logger.setContext('PaymentService');
      contextLogger.log('결제 시작');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message: '결제 시작',
        context: 'PaymentService',
      });
    });
  });

  describe('error()', () => {
    it('기본 에러 메시지를 출력한다', () => {
      logger.error('에러 발생');

      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message: '에러 발생',
        context: undefined,
      });
    });

    it('Error 객체가 전달되면 message와 stack을 추출한다', () => {
      const error = new Error('테스트 에러');
      logger.error('처리 실패', error);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message: '처리 실패',
        context: undefined,
        error: '테스트 에러',
        errorChain: undefined, // 단일 에러는 체인이 없음
        stack: expect.stringContaining('Error: 테스트 에러'),
        rootCause: '테스트 에러', // 단일 에러의 rootCause는 자기 자신
      });
    });

    it('메타데이터 객체가 전달되면 포함하여 출력한다', () => {
      logger.error('검증 실패', { field: 'email', reason: 'invalid' });

      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message: '검증 실패',
        context: undefined,
        field: 'email',
        reason: 'invalid',
      });
    });
  });

  describe('warn()', () => {
    it('경고 메시지를 출력한다', () => {
      logger.warn('주의 필요');

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
        message: '주의 필요',
        context: undefined,
      });
    });

    it('메타데이터와 함께 출력한다', () => {
      logger.warn('Rate limit 접근', { remaining: 10 });

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
        message: 'Rate limit 접근',
        context: undefined,
        remaining: 10,
      });
    });
  });

  describe('debug()', () => {
    it('디버그 메시지를 출력한다', () => {
      logger.debug('캐시 히트');

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith({
        message: '캐시 히트',
        context: undefined,
      });
    });

    it('메타데이터와 함께 출력한다', () => {
      logger.debug('캐시 히트', { key: 'user:123' });

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith({
        message: '캐시 히트',
        context: undefined,
        key: 'user:123',
      });
    });
  });

  describe('verbose()', () => {
    it('상세 메시지를 출력한다', () => {
      logger.verbose('상세 정보');

      expect(mockWinstonLogger.verbose).toHaveBeenCalledWith({
        message: '상세 정보',
        context: undefined,
      });
    });
  });

  describe('query()', () => {
    it('SQL 쿼리를 query 레벨로 출력한다', () => {
      logger.query('SELECT * FROM users WHERE id = ?');

      expect(mockWinstonLogger.log).toHaveBeenCalledWith('query', {
        message: 'SELECT * FROM users WHERE id = ?',
        context: 'TypeORM',
      });
    });

    it('컨텍스트가 설정된 경우 해당 컨텍스트를 사용한다', () => {
      const contextLogger = logger.setContext('CustomRepository');
      contextLogger.query('SELECT * FROM orders');

      expect(mockWinstonLogger.log).toHaveBeenCalledWith('query', {
        message: 'SELECT * FROM orders',
        context: 'CustomRepository',
      });
    });

    it('메타데이터(parameters, duration)와 함께 출력한다', () => {
      logger.query('SELECT * FROM users WHERE id = ?', {
        params: [123],
        duration: 15,
      });

      expect(mockWinstonLogger.log).toHaveBeenCalledWith('query', {
        message: 'SELECT * FROM users WHERE id = ?',
        context: 'TypeORM',
        params: [123],
        duration: 15,
      });
    });
  });

  describe('slowQuery()', () => {
    it('느린 쿼리를 WARN 레벨로 출력한다', () => {
      logger.slowQuery('SELECT * FROM large_table', 5000);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
        message: '[SlowQuery] SELECT * FROM large_table',
        context: 'TypeORM',
        durationMs: 5000,
        slow: true,
      });
    });

    it('컨텍스트가 설정된 경우 해당 컨텍스트를 사용한다', () => {
      const contextLogger = logger.setContext('AnalyticsRepository');
      contextLogger.slowQuery('SELECT COUNT(*) FROM events', 3000);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
        message: '[SlowQuery] SELECT COUNT(*) FROM events',
        context: 'AnalyticsRepository',
        durationMs: 3000,
        slow: true,
      });
    });

    it('추가 메타데이터와 함께 출력한다', () => {
      logger.slowQuery('SELECT * FROM orders', 10000, { table: 'orders' });

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
        message: '[SlowQuery] SELECT * FROM orders',
        context: 'TypeORM',
        durationMs: 10000,
        slow: true,
        table: 'orders',
      });
    });
  });

  describe('fatal()', () => {
    it('치명적 오류를 error 레벨로 출력하며 fatal 플래그를 추가한다', () => {
      logger.fatal('시스템 크래시');

      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message: '시스템 크래시',
        context: undefined,
        fatal: true,
      });
    });

    it('Error 객체가 전달되면 message와 stack을 추출한다', () => {
      const error = new Error('DB 연결 실패');
      logger.fatal('데이터베이스 오류', error);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message: '데이터베이스 오류',
        context: undefined,
        fatal: true,
        error: 'DB 연결 실패',
        errorChain: undefined, // 단일 에러는 체인이 없음
        stack: expect.stringContaining('Error: DB 연결 실패'),
        rootCause: 'DB 연결 실패', // 단일 에러의 rootCause는 자기 자신
      });
    });

    it('메타데이터 객체가 전달되면 포함하여 출력한다', () => {
      logger.fatal('치명적 오류', { service: 'payment', errorCode: 'E001' });

      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message: '치명적 오류',
        context: undefined,
        fatal: true,
        service: 'payment',
        errorCode: 'E001',
      });
    });
  });

  describe('Fallback 로깅 (Winston 미주입 시)', () => {
    let fallbackLogger: TraceableLogger;
    let consoleSpy: {
      log: ReturnType<typeof vi.spyOn>;
      error: ReturnType<typeof vi.spyOn>;
      warn: ReturnType<typeof vi.spyOn>;
      debug: ReturnType<typeof vi.spyOn>;
    };

    beforeEach(() => {
      // Winston 없이 생성
      fallbackLogger = new TraceableLogger();

      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      };
    });

    afterEach(() => {
      consoleSpy.log.mockRestore();
      consoleSpy.error.mockRestore();
      consoleSpy.warn.mockRestore();
      consoleSpy.debug.mockRestore();
    });

    it('log()는 console.log로 fallback한다', () => {
      fallbackLogger.log('Fallback 메시지');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Fallback 메시지'),
      );
    });

    it('error()는 console.error로 fallback한다', () => {
      fallbackLogger.error('에러 메시지');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
      );
    });

    it('warn()은 console.warn으로 fallback한다', () => {
      fallbackLogger.warn('경고 메시지');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN'),
      );
    });

    it('debug()는 console.debug로 fallback한다', () => {
      fallbackLogger.debug('디버그 메시지');

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG'),
      );
    });

    it('verbose()는 console.debug로 fallback한다', () => {
      fallbackLogger.verbose('상세 메시지');

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('VERBOSE'),
      );
    });

    it('query()는 console.log로 fallback한다', () => {
      fallbackLogger.query('SELECT 1');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('QUERY'),
      );
    });

    it('slowQuery()는 console.warn으로 fallback한다', () => {
      fallbackLogger.slowQuery('SELECT * FROM big_table', 5000);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN'),
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SlowQuery]'),
      );
    });

    it('fatal()은 console.error로 fallback한다', () => {
      fallbackLogger.fatal('치명적 오류');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]'),
      );
    });

    it('setContext가 fallback 로깅에도 적용된다', () => {
      const contextLogger = fallbackLogger.setContext('FallbackService');
      contextLogger.log('컨텍스트 메시지');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[FallbackService]'),
      );
    });
  });

  describe('메타데이터 스프레딩', () => {
    it('복잡한 메타데이터가 올바르게 전달된다', () => {
      logger.log('복잡한 로그', {
        user: { id: 1, name: '테스트' },
        items: ['a', 'b', 'c'],
        nested: { deep: { value: 42 } },
      });

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message: '복잡한 로그',
        context: undefined,
        user: { id: 1, name: '테스트' },
        items: ['a', 'b', 'c'],
        nested: { deep: { value: 42 } },
      });
    });

    it('undefined 메타데이터는 빈 객체처럼 동작한다', () => {
      logger.log('메시지만', undefined);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message: '메시지만',
        context: undefined,
      });
    });
  });
});
