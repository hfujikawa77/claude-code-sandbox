/**
 * エラーハンドリングモジュールのモック
 */

export enum ArduPilotErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  HEARTBEAT_TIMEOUT = 'HEARTBEAT_TIMEOUT',
  COMMAND_FAILED = 'COMMAND_FAILED',
  INVALID_PARAMETER = 'INVALID_PARAMETER'
}

export class ConnectionError extends Error {
  constructor(message: string, public code: ArduPilotErrorCode, public context?: any) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public timeout: number, public code?: ArduPilotErrorCode) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ErrorFactory {
  static createConnectionError(message: string, code: ArduPilotErrorCode, context?: any): ConnectionError {
    return new ConnectionError(message, code, context);
  }

  static createTimeoutError(message: string, timeout: number, code?: ArduPilotErrorCode): TimeoutError {
    return new TimeoutError(message, timeout, code);
  }
}

export class ErrorHandler {
  static log(error: Error): void {
    console.error('ArduPilot Error:', error);
  }
}

export class TimeoutPromise {
  static create<T>(promise: Promise<T>, timeout: number, message: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new TimeoutError(message, timeout)), timeout);
      })
    ]);
  }
}