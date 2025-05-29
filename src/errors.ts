/**
 * エラーハンドリングとカスタムエラー型の定義
 * ArduPilot MCP Server用の型安全なエラー管理システム
 */

/**
 * エラーコード体系
 */
export enum ArduPilotErrorCode {
  // 接続関連エラー
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_LOST = 'CONNECTION_LOST',
  HEARTBEAT_TIMEOUT = 'HEARTBEAT_TIMEOUT',
  
  // コマンド実行エラー
  COMMAND_FAILED = 'COMMAND_FAILED',
  COMMAND_TIMEOUT = 'COMMAND_TIMEOUT',
  COMMAND_REJECTED = 'COMMAND_REJECTED',
  INVALID_COMMAND = 'INVALID_COMMAND',
  
  // パラメータエラー
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  PARAMETER_OUT_OF_RANGE = 'PARAMETER_OUT_OF_RANGE',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  
  // 状態エラー
  VEHICLE_NOT_ARMED = 'VEHICLE_NOT_ARMED',
  VEHICLE_ALREADY_ARMED = 'VEHICLE_ALREADY_ARMED',
  INVALID_MODE = 'INVALID_MODE',
  UNSAFE_OPERATION = 'UNSAFE_OPERATION',
  
  // システムエラー
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // データエラー
  DATA_UNAVAILABLE = 'DATA_UNAVAILABLE',
  DATA_CORRUPTED = 'DATA_CORRUPTED',
  PARSE_ERROR = 'PARSE_ERROR'
}

/**
 * エラー重要度レベル
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * カスタムエラーベースクラス
 */
export abstract class ArduPilotError extends Error {
  public readonly code: ArduPilotErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Date;
  public readonly details?: Record<string, any>;
  public readonly troubleshooting?: string[];

  constructor(
    code: ArduPilotErrorCode,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Record<string, any>,
    troubleshooting?: string[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.timestamp = new Date();
    if (details !== undefined) this.details = details;
    if (troubleshooting !== undefined) this.troubleshooting = troubleshooting;

    // Errorクラスの適切な継承のため
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * エラー情報を構造化データとして取得
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      troubleshooting: this.troubleshooting,
      stack: this.stack
    };
  }
}

/**
 * 接続関連エラー
 */
export class ConnectionError extends ArduPilotError {
  constructor(
    code: ArduPilotErrorCode,
    message: string,
    details?: Record<string, any>
  ) {
    const troubleshooting = [
      'ArduPilotが起動していることを確認してください',
      'ネットワーク接続を確認してください',
      '接続設定（IPアドレス、ポート）が正しいことを確認してください',
      'ファイアウォールがブロックしていないか確認してください'
    ];

    super(code, message, ErrorSeverity.HIGH, details, troubleshooting);
  }
}

/**
 * コマンド実行エラー
 */
export class CommandError extends ArduPilotError {
  public readonly commandType?: string;

  constructor(
    code: ArduPilotErrorCode,
    message: string,
    commandType?: string,
    details?: Record<string, any>
  ) {
    const troubleshooting = [
      '機体がコマンドを受け入れ可能な状態か確認してください',
      'パラメータが正しい範囲内にあることを確認してください',
      '機体のモードが適切であることを確認してください',
      'ハートビート信号が正常に受信されているか確認してください'
    ];

    super(code, message, ErrorSeverity.MEDIUM, details, troubleshooting);
    if (commandType !== undefined) this.commandType = commandType;
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends ArduPilotError {
  public readonly timeoutMs: number;

  constructor(
    code: ArduPilotErrorCode,
    message: string,
    timeoutMs: number,
    details?: Record<string, any>
  ) {
    const troubleshooting = [
      'ネットワーク遅延が大きい可能性があります',
      'ArduPilotの応答が遅い可能性があります',
      'タイムアウト値を大きくしてみてください',
      '接続品質を確認してください'
    ];

    super(code, message, ErrorSeverity.HIGH, details, troubleshooting);
    this.timeoutMs = timeoutMs;
  }
}

/**
 * パラメータエラー
 */
export class ParameterError extends ArduPilotError {
  public readonly parameterName?: string;
  public readonly providedValue?: any;
  public readonly expectedRange?: { min?: number; max?: number };

  constructor(
    code: ArduPilotErrorCode,
    message: string,
    parameterName?: string,
    providedValue?: any,
    expectedRange?: { min?: number; max?: number }
  ) {
    const troubleshooting = [
      'パラメータの型と値を確認してください',
      '許可された範囲内の値を指定してください',
      '必須パラメータが不足していないか確認してください'
    ];

    super(code, message, ErrorSeverity.LOW, {
      parameterName,
      providedValue,
      expectedRange
    }, troubleshooting);

    if (parameterName !== undefined) this.parameterName = parameterName;
    if (providedValue !== undefined) this.providedValue = providedValue;
    if (expectedRange !== undefined) this.expectedRange = expectedRange;
  }
}

/**
 * エラーファクトリークラス
 */
export class ErrorFactory {
  /**
   * 接続エラーを作成
   */
  static createConnectionError(
    message: string,
    code: ArduPilotErrorCode = ArduPilotErrorCode.CONNECTION_FAILED,
    details?: Record<string, any>
  ): ConnectionError {
    return new ConnectionError(code, message, details);
  }

  /**
   * タイムアウトエラーを作成
   */
  static createTimeoutError(
    message: string,
    timeoutMs: number,
    code: ArduPilotErrorCode = ArduPilotErrorCode.CONNECTION_TIMEOUT
  ): TimeoutError {
    return new TimeoutError(code, message, timeoutMs);
  }

  /**
   * コマンドエラーを作成
   */
  static createCommandError(
    message: string,
    commandType?: string,
    code: ArduPilotErrorCode = ArduPilotErrorCode.COMMAND_FAILED,
    details?: Record<string, any>
  ): CommandError {
    return new CommandError(code, message, commandType, details);
  }

  /**
   * パラメータエラーを作成
   */
  static createParameterError(
    message: string,
    parameterName?: string,
    providedValue?: any,
    expectedRange?: { min?: number; max?: number }
  ): ParameterError {
    return new ParameterError(
      ArduPilotErrorCode.INVALID_PARAMETER,
      message,
      parameterName,
      providedValue,
      expectedRange
    );
  }

  /**
   * 一般的なエラーからArduPilotErrorに変換
   */
  static fromGenericError(
    error: Error,
    code: ArduPilotErrorCode = ArduPilotErrorCode.INTERNAL_ERROR
  ): ArduPilotError {
    if (error instanceof ArduPilotError) {
      return error;
    }

    return new (class extends ArduPilotError {})(
      code,
      error.message,
      ErrorSeverity.MEDIUM,
      { originalError: error.name, stack: error.stack }
    );
  }
}

/**
 * エラーハンドリングヘルパー関数
 */
export class ErrorHandler {
  /**
   * エラーをログ出力する
   */
  static log(error: ArduPilotError): void {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      code: error.code,
      severity: error.severity,
      message: error.message,
      details: error.details
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('[ArduPilot Error]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[ArduPilot Warning]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.LOW:
        console.info('[ArduPilot Info]', JSON.stringify(logData, null, 2));
        break;
    }
  }

  /**
   * エラーを安全に処理し、適切なレスポンスを返す
   */
  static handleError(error: unknown): {
    success: false;
    code: ArduPilotErrorCode;
    message: string;
    troubleshooting?: string[] | undefined;
    details?: Record<string, any> | undefined;
  } {
    let arduPilotError: ArduPilotError;

    if (error instanceof ArduPilotError) {
      arduPilotError = error;
    } else if (error instanceof Error) {
      arduPilotError = ErrorFactory.fromGenericError(error);
    } else {
      arduPilotError = ErrorFactory.fromGenericError(
        new Error(String(error))
      );
    }

    // エラーをログ出力
    ErrorHandler.log(arduPilotError);

    return {
      success: false,
      code: arduPilotError.code,
      message: arduPilotError.message,
      troubleshooting: arduPilotError.troubleshooting,
      details: arduPilotError.details
    };
  }
}

/**
 * タイムアウト機能付きPromiseヘルパー
 */
export class TimeoutPromise {
  /**
   * Promiseにタイムアウトを追加
   */
  static create<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(ErrorFactory.createTimeoutError(
          errorMessage || `操作がタイムアウトしました（${timeoutMs}ms）`,
          timeoutMs
        ));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }
}