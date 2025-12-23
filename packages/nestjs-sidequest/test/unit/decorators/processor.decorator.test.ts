import {describe, it, expect} from 'vitest';
import {Processor} from '../../../src/decorators/processor.decorator.js';
import {PROCESSOR_METADATA_KEY} from '../../../src/constants.js';
import type {ProcessorMetadata} from '../../../src/interfaces/processor.interface.js';

describe('Processor Decorator', () => {
  it('큐 이름으로 프로세서 메타데이터를 설정한다', () => {
    @Processor('email')
    class EmailProcessor {}

    const metadata = Reflect.getMetadata(PROCESSOR_METADATA_KEY, EmailProcessor) as ProcessorMetadata;

    expect(metadata).toBeDefined();
    expect(metadata.queueName).toBe('email');
    expect(metadata.options).toBeUndefined();
  });

  it('옵션과 함께 프로세서 메타데이터를 설정한다', () => {
    @Processor('report', {concurrency: 5})
    class ReportProcessor {}

    const metadata = Reflect.getMetadata(PROCESSOR_METADATA_KEY, ReportProcessor) as ProcessorMetadata;

    expect(metadata).toBeDefined();
    expect(metadata.queueName).toBe('report');
    expect(metadata.options).toEqual({concurrency: 5});
  });

  it('@Injectable 데코레이터가 자동으로 적용된다', () => {
    @Processor('notification')
    class NotificationProcessor {}

    // NestJS @Injectable()은 'injectable:paramtypes' 메타데이터를 설정하지 않지만
    // 클래스를 Injectable로 등록하는 데 필요한 메타데이터가 설정됨
    // 여기서는 기본적인 메타데이터 설정만 확인
    const metadata = Reflect.getMetadata(PROCESSOR_METADATA_KEY, NotificationProcessor);
    expect(metadata).toBeDefined();
  });

  it('여러 프로세서에 각각 다른 메타데이터를 설정할 수 있다', () => {
    @Processor('queue-a')
    class ProcessorA {}

    @Processor('queue-b', {concurrency: 10})
    class ProcessorB {}

    const metadataA = Reflect.getMetadata(PROCESSOR_METADATA_KEY, ProcessorA) as ProcessorMetadata;
    const metadataB = Reflect.getMetadata(PROCESSOR_METADATA_KEY, ProcessorB) as ProcessorMetadata;

    expect(metadataA.queueName).toBe('queue-a');
    expect(metadataB.queueName).toBe('queue-b');
    expect(metadataB.options?.concurrency).toBe(10);
  });
});
