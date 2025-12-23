import {describe, it, expect} from 'vitest';
import {getQueueToken, QUEUE_TOKEN_PREFIX} from '../../../src/constants.js';

describe('InjectQueue Decorator', () => {
  describe('getQueueToken', () => {
    it('큐 이름으로 DI 토큰을 생성한다', () => {
      const token = getQueueToken('email');
      expect(token).toBe(`${QUEUE_TOKEN_PREFIX}email`);
    });

    it('다른 큐 이름에 대해 다른 토큰을 생성한다', () => {
      const token1 = getQueueToken('queue-a');
      const token2 = getQueueToken('queue-b');

      expect(token1).not.toBe(token2);
      expect(token1).toBe(`${QUEUE_TOKEN_PREFIX}queue-a`);
      expect(token2).toBe(`${QUEUE_TOKEN_PREFIX}queue-b`);
    });

    it('default 큐에 대한 토큰을 생성한다', () => {
      const token = getQueueToken('default');
      expect(token).toBe(`${QUEUE_TOKEN_PREFIX}default`);
    });
  });
});
