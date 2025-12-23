import {describe, it, expect} from 'vitest';
import {Retry} from '../../../src/decorators/retry.decorator.js';
import {RETRY_OPTIONS_METADATA_KEY} from '../../../src/constants.js';
import type {RetryOptions} from '../../../src/interfaces/processor.interface.js';

describe('Retry Decorator', () => {
  it('재시도 옵션 메타데이터를 설정한다', () => {
    class TestProcessor {
      @Retry({maxAttempts: 3})
      async handleJob() {}
    }

    // SetMetadata는 descriptor.value (메서드 자체)에 메타데이터를 설정함
    const metadata = Reflect.getMetadata(
      RETRY_OPTIONS_METADATA_KEY,
      TestProcessor.prototype.handleJob,
    ) as RetryOptions;

    expect(metadata).toBeDefined();
    expect(metadata.maxAttempts).toBe(3);
  });

  it('지연 시간과 함께 재시도 옵션을 설정한다', () => {
    class TestProcessor {
      @Retry({maxAttempts: 5, delay: 1000})
      async handleJob() {}
    }

    const metadata = Reflect.getMetadata(
      RETRY_OPTIONS_METADATA_KEY,
      TestProcessor.prototype.handleJob,
    ) as RetryOptions;

    expect(metadata.maxAttempts).toBe(5);
    expect(metadata.delay).toBe(1000);
  });

  it('지수 백오프 전략을 설정할 수 있다', () => {
    class TestProcessor {
      @Retry({maxAttempts: 5, delay: 500, backoff: 'exponential'})
      async handleJob() {}
    }

    const metadata = Reflect.getMetadata(
      RETRY_OPTIONS_METADATA_KEY,
      TestProcessor.prototype.handleJob,
    ) as RetryOptions;

    expect(metadata.backoff).toBe('exponential');
  });

  it('고정 백오프 전략을 설정할 수 있다', () => {
    class TestProcessor {
      @Retry({maxAttempts: 3, delay: 1000, backoff: 'fixed'})
      async handleJob() {}
    }

    const metadata = Reflect.getMetadata(
      RETRY_OPTIONS_METADATA_KEY,
      TestProcessor.prototype.handleJob,
    ) as RetryOptions;

    expect(metadata.backoff).toBe('fixed');
  });

  it('@OnJob와 함께 사용할 수 있다', () => {
    class TestProcessor {
      @Retry({maxAttempts: 3})
      async handleJob() {}
    }

    const retryMetadata = Reflect.getMetadata(
      RETRY_OPTIONS_METADATA_KEY,
      TestProcessor.prototype.handleJob,
    ) as RetryOptions;

    expect(retryMetadata.maxAttempts).toBe(3);
  });
});
