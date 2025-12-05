import {applyDecorators, SetMetadata, UseInterceptors} from '@nestjs/common';

import {TIMEOUT_OPTIONS} from '../constants.js';
import {TimeoutInterceptor} from '../interceptors/timeout.interceptor.js';
import type {TimeoutOptionsOrMilliseconds} from '../interfaces/timeout-options.interface.js';

/**
 * 메서드 실행 시간을 제한하는 데코레이터
 *
 * @param options 타임아웃 옵션 (밀리초 숫자 또는 옵션 객체)
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ReportService {
 *   // 간단한 사용 - 5초 타임아웃
 *   @Timeout(5000)
 *   async generateReport(): Promise<Report> {
 *     return this.reportEngine.generate();
 *   }
 *
 *   // 상세 옵션
 *   @Timeout({
 *     milliseconds: 10000,
 *     message: 'Report generation timed out',
 *     enableLogging: true,
 *   })
 *   async generateLargeReport(): Promise<Report> {
 *     return this.reportEngine.generate({ size: 'large' });
 *   }
 * }
 * ```
 */
export function Timeout(options: TimeoutOptionsOrMilliseconds): MethodDecorator {
  return applyDecorators(
    SetMetadata(TIMEOUT_OPTIONS, options),
    UseInterceptors(TimeoutInterceptor),
  );
}
