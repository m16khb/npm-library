import {describe, it, expect} from 'vitest';
import {OnJob} from '../../../src/decorators/on-job.decorator.js';
import {ON_JOB_METADATA_KEY} from '../../../src/constants.js';
import type {OnJobMetadata} from '../../../src/interfaces/processor.interface.js';

describe('OnJob Decorator', () => {
  it('Job 이름으로 핸들러 메타데이터를 설정한다', () => {
    class TestProcessor {
      @OnJob('SendEmailJob')
      async handleEmail() {}
    }

    // SetMetadata는 descriptor.value (메서드 자체)에 메타데이터를 설정함
    const metadata = Reflect.getMetadata(
      ON_JOB_METADATA_KEY,
      TestProcessor.prototype.handleEmail,
    ) as OnJobMetadata;

    expect(metadata).toBeDefined();
    expect(metadata.jobName).toBe('SendEmailJob');
    expect(metadata.options).toBeUndefined();
  });

  it('옵션과 함께 핸들러 메타데이터를 설정한다', () => {
    class TestProcessor {
      @OnJob('ProcessPaymentJob', {priority: 100, timeout: 5000})
      async handlePayment() {}
    }

    const metadata = Reflect.getMetadata(
      ON_JOB_METADATA_KEY,
      TestProcessor.prototype.handlePayment,
    ) as OnJobMetadata;

    expect(metadata).toBeDefined();
    expect(metadata.jobName).toBe('ProcessPaymentJob');
    expect(metadata.options).toEqual({priority: 100, timeout: 5000});
  });

  it('하나의 프로세서에 여러 Job 핸들러를 등록할 수 있다', () => {
    class MultiJobProcessor {
      @OnJob('JobA')
      async handleJobA() {}

      @OnJob('JobB', {timeout: 10000})
      async handleJobB() {}
    }

    const metadataA = Reflect.getMetadata(
      ON_JOB_METADATA_KEY,
      MultiJobProcessor.prototype.handleJobA,
    ) as OnJobMetadata;

    const metadataB = Reflect.getMetadata(
      ON_JOB_METADATA_KEY,
      MultiJobProcessor.prototype.handleJobB,
    ) as OnJobMetadata;

    expect(metadataA.jobName).toBe('JobA');
    expect(metadataB.jobName).toBe('JobB');
    expect(metadataB.options?.timeout).toBe(10000);
  });

  it('원본 메서드 디스크립터를 반환한다', async () => {
    class TestProcessor {
      @OnJob('TestJob')
      async testMethod() {
        return 'test-result';
      }
    }

    const processor = new TestProcessor();
    const result = await processor.testMethod();
    expect(result).toBe('test-result');
  });
});
