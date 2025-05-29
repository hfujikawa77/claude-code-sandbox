/**
 * Jest Test Setup
 * テスト実行前のグローバル設定とモック設定
 */

// Jest環境設定
jest.setTimeout(30000); // 30秒タイムアウト

// グローバルモック設定
global.console = {
  ...console,
  // テスト中のログ出力を制御
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// プロセス環境変数の設定
process.env.NODE_ENV = 'test';
process.env.JEST_WORKER_ID = '1';

// テスト用のグローバル変数
global.testConfig = {
  mavlinkHost: '127.0.0.1',
  mavlinkPort: 14552,
  testTimeout: 5000,
  mockMode: true
};

// 未処理のPromise rejectionをキャッチ
process.on('unhandledRejection', (error) => {
  console.error('未処理のPromise rejection:', error);
});

// テスト前の共通設定
beforeEach(() => {
  // モックをリセット
  jest.clearAllMocks();
});

// テスト後のクリーンアップ
afterEach(() => {
  // リソースクリーンアップ
  jest.restoreAllMocks();
});

export {};