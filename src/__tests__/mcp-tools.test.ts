/**
 * MCPツール関数の単体テスト
 * 6つのMCPツール関数をモック環境で包括的にテスト
 */

import { ArduPilotMCPTools } from '../mcp-tools.js';
import { ArduPilotConnection } from '../connection.js';
import { MockMavEsp8266, mockCommon } from '../../tests/mocks/mavlink-mock.js';
import { MAV_RESULT, COPTER_MODE, GPS_FIX_TYPE, MAV_STATE } from '../mavlink-types.js';

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
  },
  common: mockCommon
}));

describe('ArduPilotMCPTools', () => {
  let connection: ArduPilotConnection;
  let tools: ArduPilotMCPTools;
  let mockMavEsp8266: MockMavEsp8266;

  beforeEach(async () => {
    // 接続とツールのセットアップ
    connection = new ArduPilotConnection({
      host: '127.0.0.1',
      port: 14552,
      sourceSystem: 1,
      sourceComponent: 90,
      timeoutMs: 5000,
      autoReconnect: false,
      maxReconnectAttempts: 1,
      reconnectInterval: 1000
    });

    tools = new ArduPilotMCPTools(connection);

    // モックインスタンスの取得
    mockMavEsp8266 = new MockMavEsp8266();
    
    // 接続をモック
    jest.spyOn(connection, 'getConnectionStatus').mockReturnValue({
      isConnected: true,
      host: '127.0.0.1',
      port: 14552,
      reconnectAttempts: 0
    });

    jest.spyOn(connection, 'sendMessage').mockResolvedValue();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (mockMavEsp8266.isConnected()) {
      await mockMavEsp8266.close();
    }
  });

  describe('armツール', () => {
    it('正常にモーターをアームできる', async () => {
      // コマンド確認の待機をモック
      jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(MAV_RESULT.ACCEPTED);

      const result = await tools.arm({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('モーターのアームが完了しました');
      expect(result.result).toBe(MAV_RESULT.ACCEPTED);
      expect(connection.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('接続されていない場合はエラーを返す', async () => {
      jest.spyOn(connection, 'getConnectionStatus').mockReturnValue({
        isConnected: false,
        host: '127.0.0.1',
        port: 14552,
        reconnectAttempts: 0
      });

      const result = await tools.arm({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('機体に接続されていません。接続を確認してください。');
    });

    it('アームが拒否された場合はエラーを返す', async () => {
      jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(MAV_RESULT.DENIED);

      const result = await tools.arm({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('アームに失敗しました');
      expect(result.result).toBe(MAV_RESULT.DENIED);
    });

    it('sendMessage例外時はエラーを返す', async () => {
      jest.spyOn(connection, 'sendMessage').mockRejectedValue(new Error('通信エラー'));

      const result = await tools.arm({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('アーム処理中にエラーが発生しました');
    });
  });

  describe('disarmツール', () => {
    it('正常にモーターをディスアームできる', async () => {
      jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(MAV_RESULT.ACCEPTED);

      const result = await tools.disarm({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('モーターのディスアームが完了しました');
      expect(result.result).toBe(MAV_RESULT.ACCEPTED);
    });

    it('接続されていない場合はエラーを返す', async () => {
      jest.spyOn(connection, 'getConnectionStatus').mockReturnValue({
        isConnected: false,
        host: '127.0.0.1',
        port: 14552,
        reconnectAttempts: 0
      });

      const result = await tools.disarm({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('機体に接続されていません。接続を確認してください。');
    });
  });

  describe('takeoffツール', () => {
    beforeEach(() => {
      // change_modeのモック（GUIDEDモード切り替え用）
      jest.spyOn(tools, 'changeMode').mockResolvedValue({
        success: true,
        message: 'フライトモードをGUIDEDに変更しました',
        mode: 'GUIDED',
        result: MAV_RESULT.ACCEPTED
      });
    });

    it('デフォルト高度で離陸できる', async () => {
      jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(MAV_RESULT.ACCEPTED);

      const result = await tools.takeoff({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('10メートルでの離陸を開始しました');
      expect(result.altitude).toBe(10);
      expect(tools.changeMode).toHaveBeenCalledWith({ mode: 'GUIDED' });
    });

    it('指定高度で離陸できる', async () => {
      jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(MAV_RESULT.ACCEPTED);

      const result = await tools.takeoff({ altitude: 25 });

      expect(result.success).toBe(true);
      expect(result.message).toBe('25メートルでの離陸を開始しました');
      expect(result.altitude).toBe(25);
    });

    it('無効な高度の場合はエラーを返す', async () => {
      const result = await tools.takeoff({ altitude: 150 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('高度は1-100メートルの範囲で指定してください');
    });

    it('GUIDEDモード変更に失敗した場合はエラーを返す', async () => {
      jest.spyOn(tools, 'changeMode').mockResolvedValue({
        success: false,
        message: 'モード変更失敗',
        mode: 'GUIDED'
      });

      const result = await tools.takeoff({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('GUIDEDモードへの変更に失敗しました');
    });
  });

  describe('change_modeツール', () => {
    it('有効なフライトモードに変更できる', async () => {
      jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(MAV_RESULT.ACCEPTED);

      const result = await tools.changeMode({ mode: 'LOITER' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('フライトモードをLOITERに変更しました');
      expect(result.mode).toBe('LOITER');
    });

    it('無効なフライトモードの場合はエラーを返す', async () => {
      const result = await tools.changeMode({ mode: 'INVALID_MODE' as any });

      expect(result.success).toBe(false);
      expect(result.message).toContain('無効なフライトモードです');
    });

    it('モード変更が拒否された場合はエラーを返す', async () => {
      jest.spyOn(tools as any, 'waitForCommandAck').mockResolvedValue(MAV_RESULT.DENIED);

      const result = await tools.changeMode({ mode: 'AUTO' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('フライトモード変更に失敗しました');
    });
  });

  describe('get_statusツール', () => {
    it('正常にステータス情報を取得できる', async () => {
      const mockHeartbeatData = {
        baseMode: 81, // ARMED | CUSTOM_MODE_ENABLED
        customMode: COPTER_MODE.GUIDED,
        systemStatus: MAV_STATE.ACTIVE
      };

      const mockBatteryInfo = {
        voltage_battery: 12600, // 12.6V
        battery_remaining: 75
      };

      jest.spyOn(tools as any, 'waitForHeartbeat').mockResolvedValue(mockHeartbeatData);
      jest.spyOn(tools as any, 'waitForSysStatus').mockResolvedValue(mockBatteryInfo);

      const result = await tools.getStatus({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('ステータス情報を取得しました');
      expect(result.status).toBeDefined();
      expect(result.status!.armed).toBe(true);
      expect(result.status!.mode).toBe('GUIDED');
      expect(result.status!.battery_voltage).toBe(12.6);
    });

    it('ハートビート取得に失敗した場合はエラーを返す', async () => {
      jest.spyOn(tools as any, 'waitForHeartbeat').mockResolvedValue(null);

      const result = await tools.getStatus({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('ハートビートメッセージを受信できませんでした');
    });
  });

  describe('get_positionツール', () => {
    it('正常に位置情報を取得できる', async () => {
      const mockPositionData = {
        lat: 357696000, // 35.7696° (東京)
        lon: 1397700000, // 139.7700°
        alt: 50000, // 50m MSL
        relative_alt: 10000, // 10m AGL
        vx: 100, // 1m/s East
        vy: 0, // 0m/s North
        vz: -50, // 0.5m/s Up
        hdg: 9000 // 90°
      };

      const mockGpsRawData = {
        fix_type: GPS_FIX_TYPE.GPS_3D_FIX,
        satellites_visible: 12
      };

      jest.spyOn(tools as any, 'waitForGlobalPosition').mockResolvedValue(mockPositionData);
      jest.spyOn(tools as any, 'waitForGpsRaw').mockResolvedValue(mockGpsRawData);

      const result = await tools.getPosition({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('位置情報を取得しました');
      expect(result.position).toBeDefined();
      expect(result.position!.latitude).toBeCloseTo(35.7696, 4);
      expect(result.position!.longitude).toBeCloseTo(139.7700, 4);
      expect(result.position!.altitude_msl).toBe(50);
      expect(result.position!.satellites_visible).toBe(12);
    });

    it('GPS位置情報取得に失敗した場合はエラーを返す', async () => {
      jest.spyOn(tools as any, 'waitForGlobalPosition').mockResolvedValue(null);

      const result = await tools.getPosition({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('GPS位置情報を受信できませんでした');
    });

    it('GPS RAWデータが取得できなくても基本情報は返す', async () => {
      const mockPositionData = {
        lat: 357696000,
        lon: 1397700000,
        alt: 50000,
        relative_alt: 10000,
        vx: 100,
        vy: 0,
        vz: -50,
        hdg: 9000
      };

      jest.spyOn(tools as any, 'waitForGlobalPosition').mockResolvedValue(mockPositionData);
      jest.spyOn(tools as any, 'waitForGpsRaw').mockRejectedValue(new Error('GPS RAW取得失敗'));

      const result = await tools.getPosition({});

      expect(result.success).toBe(true);
      expect(result.position!.gps_fix_type).toBe(GPS_FIX_TYPE.NO_FIX);
      expect(result.position!.satellites_visible).toBe(0);
    });
  });

  describe('ヘルパーメソッドのテスト', () => {
    it('getFlightModeNumber: 有効なモード名から番号を取得', () => {
      const modeNumber = (tools as any).getFlightModeNumber('GUIDED');
      expect(modeNumber).toBe(COPTER_MODE.GUIDED);
    });

    it('getFlightModeNumber: 無効なモード名はundefinedを返す', () => {
      const modeNumber = (tools as any).getFlightModeNumber('INVALID');
      expect(modeNumber).toBeUndefined();
    });

    it('getFlightModeName: 有効なモード番号から名前を取得', () => {
      const modeName = (tools as any).getFlightModeName(COPTER_MODE.LOITER);
      expect(modeName).toBe('LOITER');
    });

    it('getResultMessage: MAV_RESULTから日本語メッセージを取得', () => {
      const message = (tools as any).getResultMessage(MAV_RESULT.ACCEPTED);
      expect(message).toBe('受け入れられました');

      const errorMessage = (tools as any).getResultMessage(MAV_RESULT.DENIED);
      expect(errorMessage).toBe('拒否されました');
    });
  });
});