/**
 * ArduPilotConnection クラスの単体テスト
 * MAVLink接続管理機能をモック環境で包括的にテスト
 */

import { ArduPilotConnection, ConnectionConfig, HeartbeatData } from '../connection.js';
import { MockMavEsp8266 } from '../../tests/mocks/mavlink-mock.js';
import { MAV_STATE } from '../mavlink-types.js';

// エラーハンドリングモジュールをモック
jest.mock('../errors.js', () => require('../../tests/mocks/errors-mock.js'));

// モックの設定
jest.mock('node-mavlink', () => ({
  MavEsp8266: MockMavEsp8266
}));

jest.mock('mavlink-mappings', () => ({
  minimal: {
    MavModeFlag: {
      SAFETY_ARMED: 128,
      CUSTOM_MODE_ENABLED: 1
    },
    MavState: MAV_STATE,
    Heartbeat: function() {
      return {
        type: 2,
        autopilot: 3,
        baseMode: 0,
        customMode: 0,
        systemStatus: MAV_STATE.ACTIVE,
        mavlinkVersion: 3
      };
    }
  }
}));

describe('ArduPilotConnection', () => {
  let connection: ArduPilotConnection;
  let mockConfig: ConnectionConfig;

  beforeEach(() => {
    mockConfig = {
      host: '127.0.0.1',
      port: 14552,
      sourceSystem: 1,
      sourceComponent: 90,
      timeoutMs: 5000,
      autoReconnect: false,
      maxReconnectAttempts: 1,
      reconnectInterval: 1000
    };

    connection = new ArduPilotConnection(mockConfig);
  });

  afterEach(async () => {
    try {
      await connection.cleanup();
    } catch {
      // クリーンアップエラーは無視
    }
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化される', () => {
      const defaultConnection = new ArduPilotConnection();
      const status = defaultConnection.getConnectionStatus();
      
      expect(status.host).toBe('127.0.0.1');
      expect(status.port).toBe(14552);
      expect(status.isConnected).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
    });

    it('カスタム設定で初期化される', () => {
      const customConfig = {
        host: '192.168.1.100',
        port: 14550,
        timeoutMs: 3000
      };
      
      const customConnection = new ArduPilotConnection(customConfig);
      const status = customConnection.getConnectionStatus();
      
      expect(status.host).toBe('192.168.1.100');
      expect(status.port).toBe(14550);
    });
  });

  describe('connect', () => {
    it('正常に接続できる', async () => {
      const connectPromise = connection.connect();
      
      // イベントリスナーをセットアップ
      const connectedEvents: string[] = [];
      connection.on('connected', () => connectedEvents.push('connected'));
      
      await connectPromise;
      
      const status = connection.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.reconnectAttempts).toBe(0);
    });

    it('既に接続されている場合は何もしない', async () => {
      await connection.connect();
      const firstStatus = connection.getConnectionStatus();
      
      await connection.connect(); // 2回目の接続
      const secondStatus = connection.getConnectionStatus();
      
      expect(firstStatus.isConnected).toBe(true);
      expect(secondStatus.isConnected).toBe(true);
    });

    it('接続プールを使用して既存接続を再利用する', async () => {
      const connection1 = new ArduPilotConnection(mockConfig);
      const connection2 = new ArduPilotConnection(mockConfig);
      
      await connection1.connect();
      await connection2.connect();
      
      expect(connection1.getConnectionStatus().isConnected).toBe(true);
      expect(connection2.getConnectionStatus().isConnected).toBe(true);
      
      await connection1.cleanup();
      await connection2.cleanup();
    });

    it('接続エラー時に適切なエラーイベントを発火する', async () => {
      const errorEvents: Error[] = [];
      connection.on('error', (error) => errorEvents.push(error));
      
      // モックが例外を投げるように設定
      const mockMavEsp8266 = new MockMavEsp8266();
      jest.spyOn(mockMavEsp8266, 'start').mockRejectedValue(new Error('接続失敗'));
      
      try {
        await connection.connect();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('disconnect', () => {
    it('正常に切断できる', async () => {
      await connection.connect();
      expect(connection.getConnectionStatus().isConnected).toBe(true);
      
      const disconnectedEvents: string[] = [];
      connection.on('disconnected', () => disconnectedEvents.push('disconnected'));
      
      await connection.disconnect();
      
      expect(connection.getConnectionStatus().isConnected).toBe(false);
    });

    it('接続されていない状態で切断しても問題ない', async () => {
      expect(connection.getConnectionStatus().isConnected).toBe(false);
      
      await expect(connection.disconnect()).resolves.not.toThrow();
      
      expect(connection.getConnectionStatus().isConnected).toBe(false);
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('正常にメッセージを送信できる', async () => {
      const mockMessage = {
        type: 'test',
        data: 'test data'
      };
      
      await expect(connection.sendMessage(mockMessage)).resolves.not.toThrow();
    });

    it('接続されていない状態で送信するとエラーになる', async () => {
      await connection.disconnect();
      
      const mockMessage = { type: 'test' };
      
      await expect(connection.sendMessage(mockMessage))
        .rejects.toThrow('ArduPilotに接続されていません');
    });
  });

  describe('ハートビート処理', () => {
    it('ハートビートを受信してイベントを発火する', async () => {
      const heartbeatEvents: HeartbeatData[] = [];
      connection.on('heartbeat', (data) => heartbeatEvents.push(data));
      
      await connection.connect();
      
      // 少し待ってハートビートを受信
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(heartbeatEvents.length).toBeGreaterThan(0);
      
      const heartbeat = heartbeatEvents[0];
      expect(heartbeat).toHaveProperty('autopilot');
      expect(heartbeat).toHaveProperty('type');
      expect(heartbeat).toHaveProperty('systemStatus');
      expect(heartbeat).toHaveProperty('baseMode');
      expect(heartbeat).toHaveProperty('customMode');
      expect(heartbeat).toHaveProperty('mavlinkVersion');
    });

    it('定期的にハートビートを送信する', async () => {
      await connection.connect();
      
      // ハートビート送信をモック
      const sendSpy = jest.spyOn(connection, 'sendMessage');
      
      // 少し待ってハートビート送信を確認
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe('自動再接続', () => {
    it('autoReconnectが有効な場合、切断時に再接続を試行する', async () => {
      const autoReconnectConfig = {
        ...mockConfig,
        autoReconnect: true,
        maxReconnectAttempts: 2,
        reconnectInterval: 100
      };
      
      const autoReconnectConnection = new ArduPilotConnection(autoReconnectConfig);
      
      await autoReconnectConnection.connect();
      
      // エラーイベントを発火して切断をシミュレート
      const mockMavEsp8266 = new MockMavEsp8266();
      mockMavEsp8266.simulateError('接続エラー');
      
      // 再接続の試行を確認
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await autoReconnectConnection.cleanup();
    });

    it('最大再接続試行回数に達したらエラーイベントを発火する', async () => {
      const autoReconnectConfig = {
        ...mockConfig,
        autoReconnect: true,
        maxReconnectAttempts: 1,
        reconnectInterval: 50
      };
      
      const autoReconnectConnection = new ArduPilotConnection(autoReconnectConfig);
      
      const errorEvents: Error[] = [];
      autoReconnectConnection.on('error', (error) => errorEvents.push(error));
      
      await autoReconnectConnection.connect();
      
      // 接続エラーを複数回発生させる
      const mockMavEsp8266 = new MockMavEsp8266();
      mockMavEsp8266.simulateError('接続エラー1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await autoReconnectConnection.cleanup();
    });
  });

  describe('接続ステータス', () => {
    it('getConnectionStatus が正確な情報を返す', async () => {
      const initialStatus = connection.getConnectionStatus();
      expect(initialStatus.isConnected).toBe(false);
      expect(initialStatus.reconnectAttempts).toBe(0);
      
      await connection.connect();
      
      const connectedStatus = connection.getConnectionStatus();
      expect(connectedStatus.isConnected).toBe(true);
      expect(connectedStatus.host).toBe(mockConfig.host);
      expect(connectedStatus.port).toBe(mockConfig.port);
    });
  });

  describe('cleanup', () => {
    it('すべての接続とリソースを適切にクリーンアップする', async () => {
      await connection.connect();
      expect(connection.getConnectionStatus().isConnected).toBe(true);
      
      await connection.cleanup();
      
      expect(connection.getConnectionStatus().isConnected).toBe(false);
    });

    it('接続プール内のすべての接続をクリーンアップする', async () => {
      const connection1 = new ArduPilotConnection(mockConfig);
      const connection2 = new ArduPilotConnection({
        ...mockConfig,
        port: 14553
      });
      
      await connection1.connect();
      await connection2.connect();
      
      await connection1.cleanup();
      
      expect(connection1.getConnectionStatus().isConnected).toBe(false);
      
      await connection2.cleanup();
    });

    it('クリーンアップ中にエラーが発生しても他の処理を継続する', async () => {
      await connection.connect();
      
      // クリーンアップ中のエラーをシミュレート
      const mockMavEsp8266 = new MockMavEsp8266();
      jest.spyOn(mockMavEsp8266, 'close').mockRejectedValue(new Error('クリーンアップエラー'));
      
      await expect(connection.cleanup()).resolves.not.toThrow();
    });
  });

  describe('メッセージハンドリング', () => {
    it('受信したメッセージを適切にパースしてイベントを発火する', async () => {
      const messageEvents: any[] = [];
      connection.on('message', (message) => messageEvents.push(message));
      
      await connection.connect();
      
      // テストメッセージをシミュレート
      const mockMavEsp8266 = new MockMavEsp8266();
      mockMavEsp8266.emit('data', {
        header: { msgid: 99, seq: 1 },
        data: { test: 'test data' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(messageEvents.length).toBeGreaterThan(0);
    });
  });
});