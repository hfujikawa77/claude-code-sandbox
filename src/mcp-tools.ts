/**
 * MCPツール関数の実装
 * ArduPilot用の6つの主要ツール関数を型安全に実装
 */

import { ArduPilotConnection } from './connection.js';
import { minimal, common } from 'mavlink-mappings';
import {
  ArmToolParams,
  ArmToolResult,
  DisarmToolParams,
  DisarmToolResult,
  TakeoffToolParams,
  TakeoffToolResult,
  ChangeModeToolParams,
  ChangeModeToolResult,
  GetStatusToolParams,
  GetStatusToolResult,
  GetPositionToolParams,
  GetPositionToolResult,
  MCPErrorResult,
  VehicleStatus,
  Position
} from './types.js';
import {
  MAV_CMD,
  MAV_RESULT,
  COPTER_MODE,
  FLIGHT_MODE_NAMES,
  FlightModeName,
  GPS_FIX_TYPE,
  MAV_STATE
} from './mavlink-types.js';

export class ArduPilotMCPTools {
  private connection: ArduPilotConnection;

  constructor(connection: ArduPilotConnection) {
    this.connection = connection;
  }

  /**
   * armツール: モーターをアームします
   */
  async arm(params: ArmToolParams): Promise<ArmToolResult> {
    try {
      // 接続チェック
      const status = this.connection.getConnectionStatus();
      if (!status.isConnected) {
        return {
          success: false,
          message: '機体に接続されていません。接続を確認してください。'
        };
      }

      // アームコマンドを送信
      const armCommand = new common.CommandLong();
      armCommand.command = MAV_CMD.COMPONENT_ARM_DISARM;
      armCommand.param1 = 1; // 1 = ARM
      armCommand.param2 = 0;
      armCommand.param3 = 0;
      armCommand.param4 = 0;
      armCommand.param5 = 0;
      armCommand.param6 = 0;
      armCommand.param7 = 0;
      armCommand.targetSystem = 1;
      armCommand.targetComponent = 1;

      await this.connection.sendMessage(armCommand);

      // コマンド確認を待機
      const result = await this.waitForCommandAck(MAV_CMD.COMPONENT_ARM_DISARM, 5000);

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: 'モーターのアームが完了しました',
          result: result
        };
      } else {
        return {
          success: false,
          message: `アームに失敗しました: ${this.getResultMessage(result)}`,
          result: result
        };
      }

    } catch (error: any) {
      return {
        success: false,
        message: `アーム処理中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * disarmツール: モーターをディスアームします
   */
  async disarm(params: DisarmToolParams): Promise<DisarmToolResult> {
    try {
      // 接続チェック
      const status = this.connection.getConnectionStatus();
      if (!status.isConnected) {
        return {
          success: false,
          message: '機体に接続されていません。接続を確認してください。'
        };
      }

      // ディスアームコマンドを送信
      const disarmCommand = new common.CommandLong();
      disarmCommand.command = MAV_CMD.COMPONENT_ARM_DISARM;
      disarmCommand.param1 = 0; // 0 = DISARM
      disarmCommand.param2 = 0;
      disarmCommand.param3 = 0;
      disarmCommand.param4 = 0;
      disarmCommand.param5 = 0;
      disarmCommand.param6 = 0;
      disarmCommand.param7 = 0;
      disarmCommand.targetSystem = 1;
      disarmCommand.targetComponent = 1;

      await this.connection.sendMessage(disarmCommand);

      // コマンド確認を待機
      const result = await this.waitForCommandAck(MAV_CMD.COMPONENT_ARM_DISARM, 5000);

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: 'モーターのディスアームが完了しました',
          result: result
        };
      } else {
        return {
          success: false,
          message: `ディスアームに失敗しました: ${this.getResultMessage(result)}`,
          result: result
        };
      }

    } catch (error: any) {
      return {
        success: false,
        message: `ディスアーム処理中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * takeoffツール: 指定された高度で離陸します
   */
  async takeoff(params: TakeoffToolParams): Promise<TakeoffToolResult> {
    try {
      // 接続チェック
      const status = this.connection.getConnectionStatus();
      if (!status.isConnected) {
        return {
          success: false,
          message: '機体に接続されていません。接続を確認してください。'
        };
      }

      // 高度パラメータの検証
      const altitude = params.altitude || 10;
      if (altitude < 1 || altitude > 100) {
        return {
          success: false,
          message: '高度は1-100メートルの範囲で指定してください'
        };
      }

      // まずGUIDEDモードに変更
      const modeResult = await this.changeMode({ mode: 'GUIDED' });
      if (!modeResult.success) {
        return {
          success: false,
          message: `GUIDEDモードへの変更に失敗しました: ${modeResult.message}`
        };
      }

      // 離陸コマンドを送信
      const takeoffCommand = new common.CommandLong();
      takeoffCommand.command = MAV_CMD.NAV_TAKEOFF;
      takeoffCommand.param1 = 0; // Minimum pitch
      takeoffCommand.param2 = 0; // Empty
      takeoffCommand.param3 = 0; // Empty
      takeoffCommand.param4 = 0; // Yaw angle
      takeoffCommand.param5 = 0; // Latitude
      takeoffCommand.param6 = 0; // Longitude
      takeoffCommand.param7 = altitude; // Altitude
      takeoffCommand.targetSystem = 1;
      takeoffCommand.targetComponent = 1;

      await this.connection.sendMessage(takeoffCommand);

      // コマンド確認を待機
      const result = await this.waitForCommandAck(MAV_CMD.NAV_TAKEOFF, 10000);

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: `${altitude}メートルでの離陸を開始しました`,
          altitude: altitude,
          result: result
        };
      } else {
        return {
          success: false,
          message: `離陸に失敗しました: ${this.getResultMessage(result)}`,
          altitude: altitude,
          result: result
        };
      }

    } catch (error: any) {
      return {
        success: false,
        message: `離陸処理中にエラーが発生しました: ${error.message}`,
        altitude: params.altitude
      };
    }
  }

  /**
   * change_modeツール: フライトモードを変更します
   */
  async changeMode(params: ChangeModeToolParams): Promise<ChangeModeToolResult> {
    try {
      // 接続チェック
      const status = this.connection.getConnectionStatus();
      if (!status.isConnected) {
        return {
          success: false,
          message: '機体に接続されていません。接続を確認してください。'
        };
      }

      // フライトモードの検証
      const modeNumber = this.getFlightModeNumber(params.mode);
      if (modeNumber === undefined) {
        return {
          success: false,
          message: `無効なフライトモードです: ${params.mode}. 利用可能なモード: ${Object.values(FLIGHT_MODE_NAMES).join(', ')}`
        };
      }

      // フライトモード変更コマンドを送信
      const modeCommand = new common.CommandLong();
      modeCommand.command = MAV_CMD.DO_SET_MODE;
      modeCommand.param1 = minimal.MavModeFlag.CUSTOM_MODE_ENABLED; // base_mode
      modeCommand.param2 = modeNumber; // custom_mode
      modeCommand.param3 = 0;
      modeCommand.param4 = 0;
      modeCommand.param5 = 0;
      modeCommand.param6 = 0;
      modeCommand.param7 = 0;
      modeCommand.targetSystem = 1;
      modeCommand.targetComponent = 1;

      await this.connection.sendMessage(modeCommand);

      // コマンド確認を待機
      const result = await this.waitForCommandAck(MAV_CMD.DO_SET_MODE, 5000);

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: `フライトモードを${params.mode}に変更しました`,
          mode: params.mode,
          result: result
        };
      } else {
        return {
          success: false,
          message: `フライトモード変更に失敗しました: ${this.getResultMessage(result)}`,
          mode: params.mode,
          result: result
        };
      }

    } catch (error: any) {
      return {
        success: false,
        message: `フライトモード変更中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * get_statusツール: 機体のステータス情報を取得します
   */
  async getStatus(params: GetStatusToolParams): Promise<GetStatusToolResult> {
    try {
      // 接続チェック
      const status = this.connection.getConnectionStatus();
      if (!status.isConnected) {
        return {
          success: false,
          message: '機体に接続されていません。接続を確認してください。'
        };
      }

      // ハートビートメッセージを待機してステータスを取得
      const heartbeatData = await this.waitForHeartbeat(5000);
      
      if (!heartbeatData) {
        return {
          success: false,
          message: 'ハートビートメッセージを受信できませんでした'
        };
      }

      // システムステータスメッセージも取得を試行
      let batteryInfo;
      try {
        batteryInfo = await this.waitForSysStatus(2000);
      } catch {
        // バッテリー情報が取得できない場合は無視
      }

      const vehicleStatus: VehicleStatus = {
        armed: (heartbeatData.baseMode & minimal.MavModeFlag.SAFETY_ARMED) !== 0,
        mode: this.getFlightModeName(heartbeatData.customMode) || 'UNKNOWN',
        mode_num: heartbeatData.customMode,
        system_status: heartbeatData.systemStatus,
        battery_voltage: batteryInfo?.voltage_battery ? batteryInfo.voltage_battery / 1000 : undefined,
        battery_remaining: batteryInfo?.battery_remaining,
        gps_fix_type: undefined, // GPS情報は別途取得が必要
        satellites_visible: undefined
      };

      return {
        success: true,
        message: 'ステータス情報を取得しました',
        status: vehicleStatus
      };

    } catch (error: any) {
      return {
        success: false,
        message: `ステータス取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * get_positionツール: 機体の位置情報を取得します
   */
  async getPosition(params: GetPositionToolParams): Promise<GetPositionToolResult> {
    try {
      // 接続チェック
      const status = this.connection.getConnectionStatus();
      if (!status.isConnected) {
        return {
          success: false,
          message: '機体に接続されていません。接続を確認してください。'
        };
      }

      // GLOBAL_POSITION_INTメッセージを待機
      const positionData = await this.waitForGlobalPosition(5000);
      
      if (!positionData) {
        return {
          success: false,
          message: 'GPS位置情報を受信できませんでした'
        };
      }

      // GPS RAWデータも取得を試行
      let gpsRawData;
      try {
        gpsRawData = await this.waitForGpsRaw(2000);
      } catch {
        // GPS RAW情報が取得できない場合は無視
      }

      const position: Position = {
        latitude: positionData.lat / 1e7, // 度に変換
        longitude: positionData.lon / 1e7, // 度に変換
        altitude_msl: positionData.alt / 1000, // メートルに変換
        altitude_rel: positionData.relative_alt / 1000, // メートルに変換
        heading: positionData.hdg / 100, // 度に変換
        ground_speed: Math.sqrt(Math.pow(positionData.vx / 100, 2) + Math.pow(positionData.vy / 100, 2)), // m/s
        vertical_speed: -positionData.vz / 100, // m/s (下向きが正のため反転)
        gps_fix_type: gpsRawData?.fix_type || GPS_FIX_TYPE.NO_FIX,
        satellites_visible: gpsRawData?.satellites_visible || 0
      };

      return {
        success: true,
        message: '位置情報を取得しました',
        position: position
      };

    } catch (error: any) {
      return {
        success: false,
        message: `位置情報取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  // プライベートヘルパーメソッド

  private async waitForCommandAck(command: number, timeoutMs: number = 5000): Promise<MAV_RESULT> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connection.removeListener('message', messageHandler);
        reject(new Error('コマンド確認のタイムアウト'));
      }, timeoutMs);

      const messageHandler = (packet: any) => {
        if (packet.header?.msgid === 77 && packet.data?.command === command) { // COMMAND_ACK
          clearTimeout(timeout);
          this.connection.removeListener('message', messageHandler);
          resolve(packet.data.result);
        }
      };

      this.connection.on('message', messageHandler);
    });
  }

  private async waitForHeartbeat(timeoutMs: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connection.removeListener('heartbeat', heartbeatHandler);
        reject(new Error('ハートビートのタイムアウト'));
      }, timeoutMs);

      const heartbeatHandler = (data: any) => {
        clearTimeout(timeout);
        this.connection.removeListener('heartbeat', heartbeatHandler);
        resolve(data);
      };

      this.connection.on('heartbeat', heartbeatHandler);
    });
  }

  private async waitForGlobalPosition(timeoutMs: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connection.removeListener('message', messageHandler);
        reject(new Error('位置情報のタイムアウト'));
      }, timeoutMs);

      const messageHandler = (packet: any) => {
        if (packet.header?.msgid === 33) { // GLOBAL_POSITION_INT
          clearTimeout(timeout);
          this.connection.removeListener('message', messageHandler);
          resolve(packet.data);
        }
      };

      this.connection.on('message', messageHandler);
    });
  }

  private async waitForSysStatus(timeoutMs: number = 2000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connection.removeListener('message', messageHandler);
        reject(new Error('システムステータスのタイムアウト'));
      }, timeoutMs);

      const messageHandler = (packet: any) => {
        if (packet.header?.msgid === 1) { // SYS_STATUS
          clearTimeout(timeout);
          this.connection.removeListener('message', messageHandler);
          resolve(packet.data);
        }
      };

      this.connection.on('message', messageHandler);
    });
  }

  private async waitForGpsRaw(timeoutMs: number = 2000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connection.removeListener('message', messageHandler);
        reject(new Error('GPS RAWのタイムアウト'));
      }, timeoutMs);

      const messageHandler = (packet: any) => {
        if (packet.header?.msgid === 24) { // GPS_RAW_INT
          clearTimeout(timeout);
          this.connection.removeListener('message', messageHandler);
          resolve(packet.data);
        }
      };

      this.connection.on('message', messageHandler);
    });
  }

  private getFlightModeNumber(modeName: FlightModeName): number | undefined {
    for (const [modeNum, name] of Object.entries(FLIGHT_MODE_NAMES)) {
      if (name === modeName) {
        return parseInt(modeNum);
      }
    }
    return undefined;
  }

  private getFlightModeName(modeNumber: number): FlightModeName | undefined {
    return FLIGHT_MODE_NAMES[modeNumber] as FlightModeName;
  }

  private getResultMessage(result: MAV_RESULT): string {
    switch (result) {
      case MAV_RESULT.ACCEPTED:
        return '受け入れられました';
      case MAV_RESULT.TEMPORARILY_REJECTED:
        return '一時的に拒否されました';
      case MAV_RESULT.DENIED:
        return '拒否されました';
      case MAV_RESULT.UNSUPPORTED:
        return 'サポートされていません';
      case MAV_RESULT.FAILED:
        return '失敗しました';
      case MAV_RESULT.IN_PROGRESS:
        return '進行中です';
      case MAV_RESULT.CANCELLED:
        return 'キャンセルされました';
      default:
        return '不明な結果';
    }
  }
}