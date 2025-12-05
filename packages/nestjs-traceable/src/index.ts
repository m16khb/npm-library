/**
 * @m16khb/nestjs-traceable
 *
 * NestJS용 traceId 추적 라이브러리
 * nestjs-cls 기반으로 요청 전체에 걸쳐 traceId를 관리합니다.
 *
 * @example
 * ```typescript
 * // app.module.ts
 * import { TraceModule } from '@m16khb/nestjs-traceable';
 *
 * @Module({
 *   imports: [
 *     TraceModule.forRoot({
 *       headerName: 'X-Trace-Id',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

// NestJS exports
export * from './nestjs';
