import type {InjectionToken, ModuleMetadata, OptionalFactoryDependency, Type} from '@nestjs/common';

/**
 * 데이터베이스 백엔드 설정
 */
export interface BackendConfig {
  /**
   * 백엔드 드라이버
   * @example '@sidequest/postgres-backend', '@sidequest/mysql-backend', '@sidequest/sqlite-backend', '@sidequest/mongo-backend'
   */
  driver: string;

  /**
   * 연결 설정 (연결 문자열 또는 설정 객체)
   * @example 'postgresql://user:pass@localhost:5432/db'
   */
  config: string | Record<string, unknown>;
}

/**
 * 큐 설정
 */
export interface QueueConfig {
  /** 큐 이름 */
  name: string;

  /** 동시 처리 작업 수 (기본값: 10) */
  concurrency?: number;

  /** 우선순위 (높을수록 먼저 처리, 기본값: 50) */
  priority?: number;

  /** 초기 상태 */
  state?: 'active' | 'paused';
}

/**
 * 대시보드 설정
 */
export interface DashboardConfig {
  /** 활성화 여부 (기본값: false) */
  enabled?: boolean;

  /** 포트 (기본값: 8678) */
  port?: number;

  /** 경로 (기본값: '/') */
  path?: string;

  /** 기본 인증 */
  auth?: {
    user: string;
    password: string;
  };
}

/**
 * 로거 설정
 */
export interface LoggerConfig {
  /** 로그 레벨 */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /** JSON 형식 출력 여부 */
  json?: boolean;
}

/**
 * Graceful Shutdown 설정
 */
export interface GracefulShutdownConfig {
  /** 활성화 여부 (기본값: true) */
  enabled?: boolean;

  /** 타임아웃 (ms, 기본값: 30000) */
  timeout?: number;
}

/**
 * SidequestModule 옵션
 */
export interface SidequestModuleOptions {
  /**
   * 전역 모듈 여부 (기본값: true)
   */
  isGlobal?: boolean;

  /**
   * 데이터베이스 백엔드 설정
   */
  backend: BackendConfig;

  /**
   * 큐 설정 목록
   */
  queues?: QueueConfig[];

  /**
   * 최대 동시 작업 수 (전체, 기본값: 10)
   */
  maxConcurrentJobs?: number;

  /**
   * 최소 워커 스레드 수 (기본값: CPU 코어 수)
   */
  minThreads?: number;

  /**
   * 최대 워커 스레드 수 (기본값: minThreads * 2)
   */
  maxThreads?: number;

  /**
   * Job 폴링 간격 (ms, 기본값: 100)
   */
  jobPollingInterval?: number;

  /**
   * 오래된 Job 해제 간격 (분, 기본값: 60)
   */
  releaseStaleJobsIntervalMin?: number;

  /**
   * 완료된 Job 정리 간격 (분, 기본값: 60)
   */
  cleanupFinishedJobsIntervalMin?: number;

  /**
   * 로거 설정
   */
  logger?: LoggerConfig;

  /**
   * 대시보드 설정
   */
  dashboard?: DashboardConfig;

  /**
   * Graceful Shutdown 설정
   */
  gracefulShutdown?: GracefulShutdownConfig;

  /**
   * CLS(Continuation Local Storage) 통합 활성화 (기본값: false)
   * nestjs-cls가 설치되어 있어야 함
   */
  enableCls?: boolean;
}

/**
 * SidequestModule 비동기 옵션
 */
export interface SidequestModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * 전역 모듈 여부 (기본값: true)
   */
  isGlobal?: boolean;

  /**
   * 팩토리 함수
   */
  useFactory?: (...args: unknown[]) => Promise<SidequestModuleOptions> | SidequestModuleOptions;

  /**
   * 주입할 프로바이더
   */
  inject?: (InjectionToken | OptionalFactoryDependency)[];

  /**
   * 옵션 팩토리 클래스
   */
  useClass?: Type<SidequestOptionsFactory>;

  /**
   * 기존 옵션 팩토리 사용
   */
  useExisting?: Type<SidequestOptionsFactory>;
}

/**
 * SidequestModule 옵션 팩토리 인터페이스
 */
export interface SidequestOptionsFactory {
  createSidequestOptions(): Promise<SidequestModuleOptions> | SidequestModuleOptions;
}
