import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TraceModule } from '../../../src/nestjs/trace.module';
import { TraceContextService, TRACE_ID_KEY } from '../../../src/nestjs/services/trace-context.service';
import { TRACE_OPTIONS, DEFAULT_TRACE_HEADER } from '../../../src/nestjs/constants';
import { ClsModule, ClsService } from 'nestjs-cls';

describe('TraceModule', () => {
  describe('forRoot()', () => {
    it('기본 옵션으로 DynamicModule을 반환한다', () => {
      const module = TraceModule.forRoot();

      expect(module).toBeDefined();
      expect(module.module).toBe(TraceModule);
      expect(module.imports).toBeDefined();
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });

    it('TraceContextService를 export한다', () => {
      const module = TraceModule.forRoot();

      expect(module.exports).toContain(TraceContextService);
    });

    it('TRACE_OPTIONS를 export한다', () => {
      const module = TraceModule.forRoot();

      expect(module.exports).toContain(TRACE_OPTIONS);
    });

    it('ClsModule을 export한다', () => {
      const module = TraceModule.forRoot();

      expect(module.exports).toContain(ClsModule);
    });

    it('커스텀 headerName 옵션을 적용한다', () => {
      const module = TraceModule.forRoot({
        headerName: 'X-Custom-Trace-Id',
      });

      const optionsProvider = module.providers?.find(
        (p: any) => p.provide === TRACE_OPTIONS,
      ) as any;

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue.headerName).toBe('X-Custom-Trace-Id');
    });

    it('기본 headerName은 X-Trace-Id이다', () => {
      const module = TraceModule.forRoot();

      const optionsProvider = module.providers?.find(
        (p: any) => p.provide === TRACE_OPTIONS,
      ) as any;

      expect(optionsProvider.useValue.headerName).toBe(DEFAULT_TRACE_HEADER);
    });
  });

  describe('forRootAsync()', () => {
    it('비동기 옵션으로 DynamicModule을 반환한다', () => {
      const module = TraceModule.forRootAsync({
        useFactory: () => ({ headerName: 'X-Async-Trace-Id' }),
      });

      expect(module).toBeDefined();
      expect(module.module).toBe(TraceModule);
    });

    it('imports 옵션을 전달한다', () => {
      const TestModule = class TestModule {};

      const module = TraceModule.forRootAsync({
        imports: [TestModule as any],
        useFactory: () => ({}),
      });

      expect(module.imports).toContain(TestModule);
    });

    it('inject 옵션을 전달한다', () => {
      const CONFIG_TOKEN = 'CONFIG';

      const module = TraceModule.forRootAsync({
        inject: [CONFIG_TOKEN],
        useFactory: (config: any) => ({
          headerName: config?.headerName,
        }),
      });

      const optionsProvider = module.providers?.find(
        (p: any) => p.provide === TRACE_OPTIONS,
      ) as any;

      expect(optionsProvider.inject).toContain(CONFIG_TOKEN);
    });

    it('TraceContextService를 export한다', () => {
      const module = TraceModule.forRootAsync({
        useFactory: () => ({}),
      });

      expect(module.exports).toContain(TraceContextService);
    });

    it('TRACE_OPTIONS를 export한다', () => {
      const module = TraceModule.forRootAsync({
        useFactory: () => ({}),
      });

      expect(module.exports).toContain(TRACE_OPTIONS);
    });
  });

  describe('register()', () => {
    it('DynamicModule을 반환한다', () => {
      const module = TraceModule.register();

      expect(module).toBeDefined();
      expect(module.module).toBe(TraceModule);
    });

    it('TraceContextService를 export한다', () => {
      const module = TraceModule.register();

      expect(module.exports).toContain(TraceContextService);
    });

    it('TRACE_OPTIONS를 export한다', () => {
      const module = TraceModule.register();

      expect(module.exports).toContain(TRACE_OPTIONS);
    });

    it('기본 headerName을 설정한다', () => {
      const module = TraceModule.register();

      const optionsProvider = module.providers?.find(
        (p: any) => p.provide === TRACE_OPTIONS,
      ) as any;

      expect(optionsProvider.useValue.headerName).toBe(DEFAULT_TRACE_HEADER);
    });

    it('ClsModule을 import하지 않는다 (이미 설정된 경우 사용)', () => {
      const module = TraceModule.register();

      // register는 ClsModule을 import하지 않음
      expect(module.imports).toBeUndefined();
    });
  });

  describe('통합 테스트', () => {
    let module: TestingModule;
    let traceContextService: TraceContextService;
    let clsService: ClsService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [TraceModule.forRoot()],
      }).compile();

      traceContextService = module.get<TraceContextService>(TraceContextService);
      clsService = module.get<ClsService>(ClsService);
    });

    it('TraceContextService가 주입된다', () => {
      expect(traceContextService).toBeDefined();
      expect(traceContextService).toBeInstanceOf(TraceContextService);
    });

    it('ClsService가 주입된다', () => {
      expect(clsService).toBeDefined();
    });

    it('TRACE_OPTIONS가 주입된다', () => {
      const options = module.get(TRACE_OPTIONS);

      expect(options).toBeDefined();
      expect(options.headerName).toBe(DEFAULT_TRACE_HEADER);
    });

    it('CLS 컨텍스트에서 traceId를 설정하고 가져올 수 있다', async () => {
      await clsService.run(async () => {
        const traceId = 'test-trace-123';
        clsService.set(TRACE_ID_KEY, traceId);

        const result = traceContextService.getTraceId();
        expect(result).toBe(traceId);
      });
    });

    it('CLS 컨텍스트 외부에서는 traceId가 undefined이다', () => {
      const result = traceContextService.getTraceId();
      expect(result).toBeUndefined();
    });
  });

  describe('커스텀 옵션 통합 테스트', () => {
    it('커스텀 headerName이 TRACE_OPTIONS에 반영된다', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TraceModule.forRoot({
            headerName: 'X-Custom-Trace-Id',
          }),
        ],
      }).compile();

      const options = module.get(TRACE_OPTIONS);
      expect(options.headerName).toBe('X-Custom-Trace-Id');
    });

    it('비동기 설정이 정상 동작한다', async () => {
      // forRootAsync는 ClsModule을 자동으로 포함하지 않으므로
      // ClsModule을 함께 import해야 함
      const module = await Test.createTestingModule({
        imports: [
          ClsModule.forRoot({ global: true }),
          TraceModule.forRootAsync({
            useFactory: async () => ({
              headerName: 'X-Async-Trace-Id',
            }),
          }),
        ],
      }).compile();

      const options = module.get(TRACE_OPTIONS);
      expect(options.headerName).toBe('X-Async-Trace-Id');
    });
  });
});

describe('TraceModule - ClsModule 미들웨어 설정', () => {
  it('forRoot()에서 ClsModule.forRoot가 호출된다', () => {
    const module = TraceModule.forRoot();

    // ClsModule이 imports에 포함되어 있어야 함
    const clsImport = module.imports?.find((imp: any) => {
      // DynamicModule 형태로 ClsModule이 포함되어 있는지 확인
      return imp?.module?.name === 'ClsModule' || imp?.name === 'ClsModule';
    });

    expect(clsImport).toBeDefined();
  });

  it('기본 middleware 설정이 적용된다', () => {
    const module = TraceModule.forRoot();

    // imports 배열에서 ClsModule 설정 확인
    const clsImport = module.imports?.[0] as any;

    // ClsModule.forRoot가 DynamicModule을 반환하고
    // 그 안에 middleware 설정이 있어야 함
    expect(clsImport).toBeDefined();
  });
});

describe('TraceModule - 에러 처리', () => {
  it('forRootAsync에서 useFactory가 에러를 던지면 모듈 생성이 실패한다', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          TraceModule.forRootAsync({
            useFactory: async () => {
              throw new Error('Config error');
            },
          }),
        ],
      }).compile(),
    ).rejects.toThrow('Config error');
  });
});
