import { describe, it, expect, vi } from 'vitest';
import {
  TraceableLoggerModule,
  TRACEABLE_LOGGER_OPTIONS,
} from '../../../../src/nestjs/logger/traceable-logger.module';

describe('TraceableLoggerModule', () => {
  describe('forRoot()', () => {
    it('기본 옵션으로 DynamicModule을 반환한다', () => {
      const module = TraceableLoggerModule.forRoot();

      expect(module.module).toBe(TraceableLoggerModule);
      expect(module.imports).toBeDefined();
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });

    it('커스텀 옵션을 적용한다', () => {
      const module = TraceableLoggerModule.forRoot({
        level: 'debug',
        isLocal: true,
        appName: 'TestApp',
        traceIdLength: 16,
      });

      expect(module.module).toBe(TraceableLoggerModule);
    });

    it('isLocal: false일 때 JSON 출력 모드로 설정된다', () => {
      const module = TraceableLoggerModule.forRoot({
        isLocal: false,
      });

      expect(module.module).toBe(TraceableLoggerModule);
    });

    it('traceIdLength: 0이면 전체 traceId를 표시한다', () => {
      const module = TraceableLoggerModule.forRoot({
        traceIdLength: 0,
      });

      expect(module.module).toBe(TraceableLoggerModule);
    });
  });

  describe('forRootAsync()', () => {
    it('비동기 설정으로 DynamicModule을 반환한다', () => {
      const module = TraceableLoggerModule.forRootAsync({
        useFactory: () => ({
          level: 'info',
          isLocal: true,
        }),
      });

      expect(module.module).toBe(TraceableLoggerModule);
      expect(module.global).toBe(true);
      expect(module.imports).toBeDefined();
    });

    it('isGlobal: false로 설정할 수 있다', () => {
      const module = TraceableLoggerModule.forRootAsync({
        isGlobal: false,
        useFactory: () => ({}),
      });

      expect(module.global).toBe(false);
    });

    it('inject와 imports를 설정할 수 있다', () => {
      const MockConfigService = class {};
      const MockConfigModule = { module: class {} };

      const module = TraceableLoggerModule.forRootAsync({
        imports: [MockConfigModule as any],
        inject: [MockConfigService],
        useFactory: (_config: unknown) => ({
          level: 'debug',
        }),
      });

      expect(module.imports).toContain(MockConfigModule);
    });

    it('Promise를 반환하는 factory를 지원한다', () => {
      const module = TraceableLoggerModule.forRootAsync({
        useFactory: async () => {
          await Promise.resolve();
          return {
            level: 'verbose',
            isLocal: false,
          };
        },
      });

      expect(module.module).toBe(TraceableLoggerModule);
    });
  });

  describe('TRACEABLE_LOGGER_OPTIONS', () => {
    it('Symbol로 정의되어 있다', () => {
      expect(typeof TRACEABLE_LOGGER_OPTIONS).toBe('symbol');
      expect(TRACEABLE_LOGGER_OPTIONS.toString()).toBe('Symbol(TRACEABLE_LOGGER_OPTIONS)');
    });
  });

  describe('로그 레벨 설정', () => {
    it.each(['error', 'warn', 'info', 'query', 'debug', 'verbose'] as const)(
      '로그 레벨 %s를 설정할 수 있다',
      (level) => {
        const module = TraceableLoggerModule.forRoot({ level });
        expect(module.module).toBe(TraceableLoggerModule);
      },
    );
  });

  describe('옵션 기본값', () => {
    it('level 기본값은 info이다', () => {
      const module = TraceableLoggerModule.forRoot({});
      expect(module.module).toBe(TraceableLoggerModule);
    });

    it('appName 기본값은 Nest이다', () => {
      const module = TraceableLoggerModule.forRoot({});
      expect(module.module).toBe(TraceableLoggerModule);
    });

    it('traceIdLength 기본값은 8이다', () => {
      const module = TraceableLoggerModule.forRoot({});
      expect(module.module).toBe(TraceableLoggerModule);
    });
  });
});
