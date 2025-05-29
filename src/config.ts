/**
 * 環境変数とアプリケーション設定の管理
 */

import type { ConnectionConfig } from './connection.js';

// 環境変数の型定義
interface EnvironmentConfig {
  // ArduPilot接続設定
  ARDUPILOT_HOST: string;
  ARDUPILOT_PORT: string;
  ARDUPILOT_PROTOCOL: 'udp' | 'tcp';
  
  // システム設定
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  
  // MCP設定
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;
  
  // 接続パラメータ
  SOURCE_SYSTEM: string;
  SOURCE_COMPONENT: string;
  CONNECTION_TIMEOUT: string;
  
  // 再接続設定
  AUTO_RECONNECT: string;
  MAX_RECONNECT_ATTEMPTS: string;
  RECONNECT_INTERVAL: string;
  
  // セキュリティ設定
  VALIDATE_COMMANDS: string;
  ALLOWED_SYSTEMS?: string;
  
  // ログ設定
  LOG_FILE?: string;
  LOG_MAX_SIZE?: string;
  LOG_MAX_FILES?: string;
}

/**
 * 環境変数を安全に取得するヘルパー関数
 */
function getEnvVar(key: keyof EnvironmentConfig, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

/**
 * 文字列を数値に変換（エラーハンドリング付き）
 */
function parseNumber(value: string, varName: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${varName} must be a valid number, got: ${value}`);
  }
  return parsed;
}

/**
 * 文字列をブール値に変換
 */
function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * アプリケーション設定クラス
 */
export class Config {
  // ArduPilot接続設定
  public readonly connection: ConnectionConfig;
  
  // MCP サーバー設定
  public readonly server: {
    name: string;
    version: string;
  };
  
  // 環境設定
  public readonly environment: {
    nodeEnv: 'development' | 'production' | 'test';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  };
  
  // セキュリティ設定
  public readonly security: {
    validateCommands: boolean;
    allowedSystems?: number[];
  };
  
  // ログ設定
  public readonly logging: {
    file?: string;
    maxSize?: string;
    maxFiles?: number;
  };

  constructor() {
    // ArduPilot接続設定
    this.connection = {
      host: getEnvVar('ARDUPILOT_HOST', '127.0.0.1'),
      port: parseNumber(getEnvVar('ARDUPILOT_PORT', '14552'), 'ARDUPILOT_PORT'),
      sourceSystem: parseNumber(getEnvVar('SOURCE_SYSTEM', '1'), 'SOURCE_SYSTEM'),
      sourceComponent: parseNumber(getEnvVar('SOURCE_COMPONENT', '90'), 'SOURCE_COMPONENT'),
      timeoutMs: parseNumber(getEnvVar('CONNECTION_TIMEOUT', '10000'), 'CONNECTION_TIMEOUT'),
      autoReconnect: parseBoolean(getEnvVar('AUTO_RECONNECT', 'true')),
      maxReconnectAttempts: parseNumber(getEnvVar('MAX_RECONNECT_ATTEMPTS', '5'), 'MAX_RECONNECT_ATTEMPTS'),
      reconnectInterval: parseNumber(getEnvVar('RECONNECT_INTERVAL', '5000'), 'RECONNECT_INTERVAL')
    };

    // MCP サーバー設定
    this.server = {
      name: getEnvVar('MCP_SERVER_NAME', 'ArduPilot Controller'),
      version: getEnvVar('MCP_SERVER_VERSION', '1.0.0')
    };

    // 環境設定
    const nodeEnv = getEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test';
    this.environment = {
      nodeEnv,
      logLevel: getEnvVar('LOG_LEVEL', nodeEnv === 'production' ? 'info' : 'debug') as 'debug' | 'info' | 'warn' | 'error',
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test'
    };

    // セキュリティ設定
    const allowedSystemsStr = process.env.ALLOWED_SYSTEMS;
    this.security = {
      validateCommands: parseBoolean(getEnvVar('VALIDATE_COMMANDS', 'true')),
      ...(allowedSystemsStr && { 
        allowedSystems: allowedSystemsStr.split(',').map(s => parseNumber(s.trim(), 'ALLOWED_SYSTEMS'))
      })
    };

    // ログ設定
    this.logging = {
      ...(process.env.LOG_FILE && { file: process.env.LOG_FILE }),
      ...(process.env.LOG_MAX_SIZE && { maxSize: process.env.LOG_MAX_SIZE }),
      ...(process.env.LOG_MAX_FILES && { 
        maxFiles: parseNumber(process.env.LOG_MAX_FILES, 'LOG_MAX_FILES')
      })
    };

    // 設定検証
    this.validate();
  }

  /**
   * 設定値の検証
   */
  private validate(): void {
    // ポート番号の検証
    if (this.connection.port < 1 || this.connection.port > 65535) {
      throw new Error(`Invalid port number: ${this.connection.port}. Must be between 1 and 65535.`);
    }

    // タイムアウトの検証
    if (this.connection.timeoutMs < 1000) {
      throw new Error(`Connection timeout too low: ${this.connection.timeoutMs}ms. Minimum is 1000ms.`);
    }

    // ログレベルの検証
    if (!['debug', 'info', 'warn', 'error'].includes(this.environment.logLevel)) {
      throw new Error(`Invalid log level: ${this.environment.logLevel}`);
    }
  }

  /**
   * 設定情報をログ出力用に安全な形式で取得
   */
  public getSafeConfig(): Record<string, any> {
    return {
      connection: {
        host: this.connection.host,
        port: this.connection.port,
        sourceSystem: this.connection.sourceSystem,
        sourceComponent: this.connection.sourceComponent,
        timeoutMs: this.connection.timeoutMs,
        autoReconnect: this.connection.autoReconnect,
        maxReconnectAttempts: this.connection.maxReconnectAttempts,
        reconnectInterval: this.connection.reconnectInterval
      },
      server: this.server,
      environment: this.environment,
      security: {
        validateCommands: this.security.validateCommands,
        allowedSystemsCount: this.security.allowedSystems?.length || 0
      },
      logging: {
        hasFile: !!this.logging.file,
        maxSize: this.logging.maxSize,
        maxFiles: this.logging.maxFiles
      }
    };
  }

  /**
   * 開発環境かどうかの判定
   */
  public isDevelopment(): boolean {
    return this.environment.isDevelopment;
  }

  /**
   * 本番環境かどうかの判定
   */
  public isProduction(): boolean {
    return this.environment.isProduction;
  }

  /**
   * テスト環境かどうかの判定
   */
  public isTest(): boolean {
    return this.environment.isTest;
  }
}

// グローバル設定インスタンス
export const config = new Config();

// デフォルトエクスポート
export default config;