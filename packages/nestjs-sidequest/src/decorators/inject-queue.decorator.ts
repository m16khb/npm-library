import {Inject} from '@nestjs/common';
import {getQueueToken} from '../constants.js';

/**
 * Queue 인스턴스를 주입합니다.
 *
 * SidequestModule.forRoot()에서 등록된 큐를 서비스에 주입받아 사용할 수 있습니다.
 *
 * @param queueName - 주입받을 큐 이름
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectQueue('email') private emailQueue: IQueueService,
 *     @InjectQueue('notification') private notificationQueue: IQueueService,
 *   ) {}
 *
 *   async createUser(email: string, name: string) {
 *     // 사용자 생성 로직...
 *
 *     // 환영 이메일 발송
 *     await this.emailQueue.add(SendWelcomeEmailJob, email, `Welcome, ${name}!`);
 *
 *     // 알림 발송
 *     await this.notificationQueue.add(SendNotificationJob, email, 'new-user');
 *   }
 * }
 * ```
 */
export function InjectQueue(queueName: string): ParameterDecorator {
  return Inject(getQueueToken(queueName));
}
