import { vi } from 'vitest';

/**
 * 타이머 관련 테스트 헬퍼 함수들
 */

/**
 * Fake timers를 설정합니다
 */
export function setupFakeTimers(): void {
  // Vitest의 fake timers 사용
  vi.useFakeTimers();
}

/**
 * Fake timers를 정리합니다
 */
export function cleanupFakeTimers(): void {
  // Vitest의 real timers로 복원
  vi.useRealTimers();
}

/**
 * 시간을 특정 밀리초만큼 진행시킵니다
 */
export function advanceTimersByTime(ms: number): void {
  // Vitest의 advanceTimersByTime 사용
  vi.advanceTimersByTime(ms);
}

/**
 * 시간을 진행시키고 Promise microtask가 처리될 때까지 기다립니다
 */
export async function advanceTimersAndWait(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  // microtask 큐가 처리될 시간을 줌
  await Promise.resolve();
}

/**
 * 특정 밀리초만큼 시간을 진행시키고 타이머를 기다립니다
 */
export async function tickAsync(clock: InstalledClock, ms: number): Promise<void> {
  clock.tick(ms);
  // Promise microtask가 처리될 시간을 줍니다
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * 여러 밀리초를 순차적으로 진행시킵니다
 */
export async function tickMultiple(
  clock: InstalledClock,
  delays: number[]
): Promise<void> {
  for (const delay of delays) {
    await tickAsync(clock, delay);
  }
}

/**
 * 지연 시간 배열을 생성합니다 (exponential backoff용)
 */
export function createExponentialDelays(
  baseDelay: number,
  count: number,
  maxDelay?: number
): number[] {
  const delays: number[] = [];
  for (let i = 0; i < count; i++) {
    const delay = baseDelay * Math.pow(2, i);
    delays.push(maxDelay ? Math.min(delay, maxDelay) : delay);
  }
  return delays;
}

/**
 * 선형 지연 시간 배열을 생성합니다
 */
export function createLinearDelays(delay: number, count: number): number[] {
  return Array(count).fill(delay);
}

/**
 * 현재 시간이 특정 범위 내에 있는지 확인합니다
 */
export function expectTimeInRange(
  actual: number,
  expected: number,
  tolerance: number = 50
): void {
  const min = expected - tolerance;
  const max = expected + tolerance;
  
  if (actual < min || actual > max) {
    throw new Error(
      `Expected time to be within ${min}ms and ${max}ms, got ${actual}ms`
    );
  }
}

/**
 * clock.now()와 Date.now()의 동기화를 보장합니다
 */
export function syncClockTime(clock: InstalledClock): void {
  // fake-timers의 Date.now()와 실제 Date.now()를 동기화
  const now = Date.now();
  clock.setSystemTime(now);
}
