/**
 * 拡張MCPツール関数の実装
 * エラーハンドリングと接続管理を改善したArduPilot用ツール関数
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
import { 
  ErrorFactory, 
  ErrorHandler, 
  ArduPilotErrorCode, 
  TimeoutPromise,
  CommandError,
  ParameterError,
  ConnectionError 
} from './errors.js';

export class EnhancedArduPilotMCPTools {
  private connection: ArduPilotConnection;
  private commandAckListeners: Map<number, { resolve: Function; timeout: NodeJS.Timeout }> = new Map();

  constructor(connection: ArduPilotConnection) {
    this.connection = connection;
    this.setupEventHandlers();
  }

  /**
   * イベントハンドラーのセットアップ
   */
  private setupEventHandlers(): void {
    this.connection.on('message', (packet: any) => {
      if (packet.header?.msgid === 77) { // COMMAND_ACK message ID
        this.handleCommandAck(packet.data);
      }
    });
  }

  /**
   * コマンド確認応答の処理
   */
  private handleCommandAck(ackData: any): void {
    const command = ackData.command;
    const listener = this.commandAckListeners.get(command);
    
    if (listener) {
      clearTimeout(listener.timeout);
      this.commandAckListeners.delete(command);
      listener.resolve(ackData.result);
    }
  }

  /**
   * コマンド確認応答を待機
   */
  private waitForCommandAck(command: number, timeoutMs: number = 5000): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.commandAckListeners.delete(command);
        reject(ErrorFactory.createTimeoutError(
          `コマンド ${command} の確認応答がタイムアウトしました`,
          timeoutMs,
          ArduPilotErrorCode.COMMAND_TIMEOUT
        ));
      }, timeoutMs);

      this.commandAckListeners.set(command, { resolve, timeout });
    });
  }

  /**
   * 接続状態の検証
   */
  private validateConnection(): void {
    const status = this.connection.getConnectionStatus();
    if (!status.isConnected) {
      throw ErrorFactory.createConnectionError(
        '機体に接続されていません。接続を確認してください。',
        ArduPilotErrorCode.CONNECTION_LOST,
        { connectionStatus: status }
      );
    }

    if (!this.connection.isHealthy()) {
      throw ErrorFactory.createConnectionError(
        '接続状態が不安定です。再接続を試してください。',
        ArduPilotErrorCode.CONNECTION_FAILED,
        { connectionStatus: status }
      );
    }
  }

  /**
   * armツール: モーターをアームします
   */
  async arm(params: ArmToolParams): Promise<ArmToolResult> {
    try {
      this.validateConnection();

      // アームコマンドを送信
      const armCommand = new common.CommandLong();
      armCommand.command = common.MavCmd.COMPONENT_ARM_DISARM;
      armCommand._param1 = 1; // 1 = ARM
      armCommand._param2 = 0;
      armCommand._param3 = 0;
      armCommand._param4 = 0;
      armCommand._param5 = 0;
      armCommand._param6 = 0;
      armCommand._param7 = 0;
      armCommand.targetSystem = 1;
      armCommand.targetComponent = 1;

      await this.connection.sendMessage(armCommand);

      // コマンド確認を待機（タイムアウト付き）
      const result = await TimeoutPromise.create(
        this.waitForCommandAck(common.MavCmd.COMPONENT_ARM_DISARM),
        10000,
        'アームコマンドの確認応答がタイムアウトしました'
      );

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: 'モーターのアームが完了しました',
          result: result
        };
      } else {
        throw ErrorFactory.createCommandError(
          `アームコマンドが拒否されました: ${this.getMAVResultMessage(result)}`,
          'ARM',
          ArduPilotErrorCode.COMMAND_REJECTED,
          { result }
        );
      }

    } catch (error: any) {
      return ErrorHandler.handleError(error);
    }
  }

  /**
   * disarmツール: モーターをディスアームします
   */
  async disarm(params: DisarmToolParams): Promise<DisarmToolResult> {
    try {
      this.validateConnection();

      // ディスアームコマンドを送信
      const disarmCommand = new common.CommandLong();
      disarmCommand.command = common.MavCmd.COMPONENT_ARM_DISARM;
      disarmCommand._param1 = 0; // 0 = DISARM
      disarmCommand._param2 = 0;
      disarmCommand._param3 = 0;
      disarmCommand._param4 = 0;
      disarmCommand._param5 = 0;
      disarmCommand._param6 = 0;
      disarmCommand._param7 = 0;
      disarmCommand.targetSystem = 1;
      disarmCommand.targetComponent = 1;

      await this.connection.sendMessage(disarmCommand);

      const result = await TimeoutPromise.create(
        this.waitForCommandAck(common.MavCmd.COMPONENT_ARM_DISARM),
        10000,
        'ディスアームコマンドの確認応答がタイムアウトしました'
      );

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: 'モーターのディスアームが完了しました',
          result: result
        };
      } else {
        throw ErrorFactory.createCommandError(
          `ディスアームコマンドが拒否されました: ${this.getMAVResultMessage(result)}`,
          'DISARM',
          ArduPilotErrorCode.COMMAND_REJECTED,
          { result }
        );
      }

    } catch (error: any) {
      return ErrorHandler.handleError(error);
    }
  }

  /**
   * takeoffツール: 指定された高度で離陸します
   */
  async takeoff(params: TakeoffToolParams): Promise<TakeoffToolResult> {
    try {
      this.validateConnection();

      // パラメータ検証
      const altitude = params.altitude || 10;
      if (altitude < 1 || altitude > 100) {
        throw ErrorFactory.createParameterError(
          '高度は1〜100メートルの範囲で指定してください',
          'altitude',
          altitude,
          { min: 1, max: 100 }
        );
      }

      // GUIDEDモードに変更
      const modeResult = await this.changeMode({ mode: 'GUIDED' });
      if (!modeResult.success) {
        throw ErrorFactory.createCommandError(
          `GUIDEDモードへの変更に失敗しました: ${modeResult.message}`,
          'TAKEOFF_MODE_CHANGE',
          ArduPilotErrorCode.COMMAND_FAILED
        );
      }

      // 離陸コマンドを送信
      const takeoffCommand = new common.CommandLong();
      takeoffCommand.command = common.MavCmd.NAV_TAKEOFF;
      takeoffCommand._param1 = 0; // Minimum pitch
      takeoffCommand._param2 = 0; // Empty
      takeoffCommand._param3 = 0; // Empty
      takeoffCommand._param4 = 0; // Yaw angle
      takeoffCommand._param5 = 0; // Latitude
      takeoffCommand._param6 = 0; // Longitude
      takeoffCommand._param7 = altitude; // Altitude
      takeoffCommand.targetSystem = 1;
      takeoffCommand.targetComponent = 1;

      await this.connection.sendMessage(takeoffCommand);

      const result = await TimeoutPromise.create(
        this.waitForCommandAck(common.MavCmd.NAV_TAKEOFF),
        15000,
        '離陸コマンドの確認応答がタイムアウトしました'
      );

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: `${altitude}メートルでの離陸を開始しました`,
          altitude: altitude,
          result: result
        };
      } else {
        throw ErrorFactory.createCommandError(
          `離陸コマンドが拒否されました: ${this.getMAVResultMessage(result)}`,
          'TAKEOFF',
          ArduPilotErrorCode.COMMAND_REJECTED,
          { result, altitude }
        );
      }

    } catch (error: any) {
      return ErrorHandler.handleError(error);
    }
  }

  /**
   * change_modeツール: フライトモードを変更します
   */
  async changeMode(params: ChangeModeToolParams): Promise<ChangeModeToolResult> {
    try {
      this.validateConnection();

      // パラメータ検証
      if (!params.mode) {
        throw ErrorFactory.createParameterError(
          'モードパラメータが必要です',
          'mode',
          params.mode
        );
      }

      const modeNumber = COPTER_MODE[params.mode as keyof typeof COPTER_MODE];
      if (modeNumber === undefined) {
        throw ErrorFactory.createParameterError(
          `無効なフライトモードです: ${params.mode}. 利用可能なモード: ${Object.keys(COPTER_MODE).join(', ')}`,
          'mode',
          params.mode
        );
      }

      // フライトモード変更コマンドを送信
      const modeCommand = new common.CommandLong();
      modeCommand.command = common.MavCmd.DO_SET_MODE;
      modeCommand._param1 = minimal.MavModeFlag.CUSTOM_MODE_ENABLED; // base_mode
      modeCommand._param2 = modeNumber; // custom_mode
      modeCommand._param3 = 0;
      modeCommand._param4 = 0;
      modeCommand._param5 = 0;
      modeCommand._param6 = 0;
      modeCommand._param7 = 0;
      modeCommand.targetSystem = 1;
      modeCommand.targetComponent = 1;

      await this.connection.sendMessage(modeCommand);

      const result = await TimeoutPromise.create(
        this.waitForCommandAck(common.MavCmd.DO_SET_MODE),
        10000,
        'モード変更コマンドの確認応答がタイムアウトしました'
      );

      if (result === MAV_RESULT.ACCEPTED) {
        return {
          success: true,
          message: `フライトモードを${params.mode}に変更しました`,
          mode: params.mode,
          result: result
        };
      } else {
        throw ErrorFactory.createCommandError(
          `モード変更コマンドが拒否されました: ${this.getMAVResultMessage(result)}`,
          'CHANGE_MODE',
          ArduPilotErrorCode.COMMAND_REJECTED,
          { result, mode: params.mode }
        );
      }

    } catch (error: any) {
      return ErrorHandler.handleError(error);
    }
  }

  /**
   * get_statusツール: 機体のステータス情報を取得します
   */
  async getStatus(params: GetStatusToolParams): Promise<GetStatusToolResult> {
    try {
      this.validateConnection();

      // ステータス情報を一定時間待機して取得
      const statusPromise = new Promise<VehicleStatus>((resolve, reject) => {
        let heartbeatData: any = null;
        let batteryInfo: any = null;
        let gpsInfo: any = null;

        const timeout = setTimeout(() => {
          reject(ErrorFactory.createTimeoutError(
            'ステータス情報の取得がタイムアウトしました',
            5000,
            ArduPilotErrorCode.DATA_UNAVAILABLE
          ));
        }, 5000);

        const messageHandler = (packet: any) => {
          try {
            // ハートビート情報の収集
            if (packet.header?.msgid === 0) {
              heartbeatData = packet.data;
            }
            
            // バッテリー情報の収集
            if (packet.header?.msgid === 147) {
              batteryInfo = packet.data;
            }

            // GPS情報の収集
            if (packet.header?.msgid === 24) {
              gpsInfo = packet.data;
            }

            // 必要な情報が揃ったら応答を返す
            if (heartbeatData) {
              clearTimeout(timeout);
              this.connection.off('message', messageHandler);

              const vehicleStatus: VehicleStatus = {
                armed: (heartbeatData.base_mode & minimal.MavModeFlag.SAFETY_ARMED) !== 0,
                mode: this.getFlightModeName(heartbeatData.custom_mode) || 'UNKNOWN',
                mode_num: heartbeatData.custom_mode,
                system_status: heartbeatData.system_status,
                battery_voltage: batteryInfo?.voltage_battery ? batteryInfo.voltage_battery / 1000 : 0,
                battery_remaining: batteryInfo?.battery_remaining || 0,
                gps_fix_type: gpsInfo?.fix_type || GPS_FIX_TYPE.NO_FIX,
                satellites_visible: gpsInfo?.satellites_visible || 0
              };

              resolve(vehicleStatus);
            }
          } catch (error) {
            clearTimeout(timeout);
            this.connection.off('message', messageHandler);
            reject(ErrorFactory.createConnectionError(
              `ステータス情報の解析中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
              ArduPilotErrorCode.DATA_CORRUPTED
            ));
          }
        };

        this.connection.on('message', messageHandler);
      });

      const status = await TimeoutPromise.create(statusPromise, 5000);

      return {
        success: true,
        message: 'ステータス情報を取得しました',
        status: status
      };

    } catch (error: any) {
      return ErrorHandler.handleError(error);
    }
  }

  /**
   * get_positionツール: 機体の位置情報を取得します
   */
  async getPosition(params: GetPositionToolParams): Promise<GetPositionToolResult> {
    try {
      this.validateConnection();

      // 位置情報を一定時間待機して取得
      const positionPromise = new Promise<Position>((resolve, reject) => {
        let globalPos: any = null;
        let attitude: any = null;
        let gpsRaw: any = null;

        const timeout = setTimeout(() => {
          reject(ErrorFactory.createTimeoutError(
            '位置情報の取得がタイムアウトしました',
            5000,
            ArduPilotErrorCode.DATA_UNAVAILABLE
          ));
        }, 5000);

        const messageHandler = (packet: any) => {
          try {
            // グローバル位置情報
            if (packet.header?.msgid === 33) {
              globalPos = packet.data;
            }
            
            // 姿勢情報
            if (packet.header?.msgid === 30) {
              attitude = packet.data;
            }

            // GPS生データ
            if (packet.header?.msgid === 24) {
              gpsRaw = packet.data;
            }

            // 必要な情報が揃ったら応答を返す
            if (globalPos && attitude) {
              clearTimeout(timeout);
              this.connection.off('message', messageHandler);

              const position: Position = {
                latitude: globalPos.lat / 1e7,
                longitude: globalPos.lon / 1e7,
                altitude_msl: globalPos.alt / 1000,
                altitude_rel: globalPos.relative_alt / 1000,
                heading: attitude.yaw * 180 / Math.PI,
                ground_speed: Math.sqrt(globalPos.vx * globalPos.vx + globalPos.vy * globalPos.vy) / 100,
                vertical_speed: globalPos.vz / 100,
                gps_fix_type: gpsRaw?.fix_type || GPS_FIX_TYPE.NO_FIX,
                satellites_visible: gpsRaw?.satellites_visible || 0
              };

              resolve(position);
            }
          } catch (error) {
            clearTimeout(timeout);
            this.connection.off('message', messageHandler);
            reject(ErrorFactory.createConnectionError(
              `位置情報の解析中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
              ArduPilotErrorCode.DATA_CORRUPTED
            ));
          }
        };

        this.connection.on('message', messageHandler);
      });

      const position = await TimeoutPromise.create(positionPromise, 5000);

      return {
        success: true,
        message: '位置情報を取得しました',
        position: position
      };

    } catch (error: any) {
      return ErrorHandler.handleError(error);
    }
  }

  /**
   * MAV_RESULTメッセージを日本語に変換
   */
  private getMAVResultMessage(result: number): string {
    const messages: Record<number, string> = {
      [MAV_RESULT.ACCEPTED]: 'コマンドが受け入れられました',
      [MAV_RESULT.TEMPORARILY_REJECTED]: 'コマンドが一時的に拒否されました',
      [MAV_RESULT.DENIED]: 'コマンドが拒否されました',
      [MAV_RESULT.UNSUPPORTED]: 'コマンドがサポートされていません',
      [MAV_RESULT.FAILED]: 'コマンドの実行に失敗しました',
      [MAV_RESULT.IN_PROGRESS]: 'コマンドを実行中です'
    };
    
    return messages[result] || `不明な結果コード: ${result}`;
  }

  /**
   * フライトモード番号から名前を取得
   */
  private getFlightModeName(modeNumber: number): string | undefined {
    return FLIGHT_MODE_NAMES[modeNumber];
  }

  /**
   * リソースのクリーンアップ
   */
  async cleanup(): Promise<void> {
    // すべてのコマンド確認応答リスナーをクリア
    for (const [command, listener] of this.commandAckListeners) {
      clearTimeout(listener.timeout);
    }
    this.commandAckListeners.clear();
  }
}