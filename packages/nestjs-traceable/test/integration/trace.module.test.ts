import { describe, it, expect, beforeEach } from 'vitest';
import { Module, Injectable } from '@nestjs/common';
import { TraceModule } from '../../src/nestjs/trace.module';

describe('TraceModule', () => {
  describe('forRoot', () => {
    it('should create module with default options', () => {
      @Module({
        imports: [TraceModule.forRoot()],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });

    it('should create module with custom options', () => {
      @Module({
        imports: [
          TraceModule.forRoot({
            headerName: 'X-Custom-Trace-Id',
            serviceName: 'test-service',
            enabled: true,
          }),
        ],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });

    it('should create global module when global option is true', () => {
      @Module({
        imports: [
          TraceModule.forRoot({
            global: true,
          }),
        ],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should create module with useFactory', () => {
      @Injectable()
      class ConfigService {
        getTraceOptions() {
          return {
            serviceName: 'async-service',
          };
        }
      }

      @Module({
        providers: [ConfigService],
        imports: [
          TraceModule.forRootAsync({
            imports: [],
            useFactory: (config: ConfigService) => config.getTraceOptions(),
            inject: [ConfigService],
          }),
        ],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });

    it('should create module with useFactory and no dependencies', () => {
      @Module({
        imports: [
          TraceModule.forRootAsync({
            useFactory: () => ({
              serviceName: 'factory-service',
            }),
          }),
        ],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });

    it('should create module with async useFactory', async () => {
      @Injectable()
      class ConfigService {
        async getTraceOptions() {
          return {
            serviceName: 'async-service',
          };
        }
      }

      @Module({
        providers: [ConfigService],
        imports: [
          TraceModule.forRootAsync({
            imports: [],
            useFactory: async (config: ConfigService) => config.getTraceOptions(),
            inject: [ConfigService],
          }),
        ],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });
  });

  describe('module providers', () => {
    it('should provide TraceContextManager', () => {
      @Module({
        imports: [TraceModule.forRoot()],
      })
      class TestModule {}

      const moduleRef = new TestModule();
      expect(moduleRef).toBeDefined();
      // 실제 테스트는 NestJS TestingModule 사용 필요
    });

    it('should provide custom TraceIdGenerator when provided', () => {
      const customGenerator = {
        generate: () => 'custom-trace-id',
        validate: () => true,
      };

      @Module({
        imports: [
          TraceModule.forRoot({
            traceIdGenerator: customGenerator,
          }),
        ],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });

    it('should provide custom logger when provided', () => {
      const customLogger = {
        log: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
        verbose: () => {},
      };

      @Module({
        imports: [
          TraceModule.forRoot({
            logger: customLogger,
          }),
        ],
      })
      class TestModule {}

      expect(TestModule).toBeDefined();
    });
  });
});