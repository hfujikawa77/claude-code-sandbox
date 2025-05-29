/**
 * MAVLink Mock Implementation
 * ArduPilot SITL環境を模擬するモック実装
 */

import { EventEmitter } from 'events';
import { MAV_RESULT, COPTER_MODE, GPS_FIX_TYPE, MAV_STATE } from '../../src/mavlink-types.js';

export class MockMavEsp8266 extends EventEmitter {
  private connected = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private messageSequence = 0;

  async start(port1: number, port2: number, host: string): Promise<void> {
    this.connected = true;
    this.startHeartbeat();
    
    // 接続成功をシミュレート
    setTimeout(() => {
      this.emit('connect');
    }, 100);
  }

  async close(): Promise<void> {
    this.connected = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.emit('disconnect');
  }

  async send(message: any, systemId?: number, componentId?: number): Promise<void> {
    if (!this.connected) {
      throw new Error('接続されていません');
    }

    // コマンドに対する応答を模擬
    setTimeout(() => {
      this.simulateCommandAck(message);
    }, 50);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.emit('data', this.createHeartbeatMessage());
      }
    }, 1000);
  }

  private createHeartbeatMessage() {
    return {
      header: {
        msgid: 0,
        seq: this.messageSequence++,
        system_id: 1,
        component_id: 1
      },
      data: {
        type: 2, // MAV_TYPE_QUADROTOR
        autopilot: 3, // MAV_AUTOPILOT_ARDUPILOTMEGA
        base_mode: 81, // CUSTOM_MODE_ENABLED | SAFETY_ARMED
        custom_mode: COPTER_MODE.GUIDED,
        system_status: MAV_STATE.ACTIVE,
        mavlink_version: 3
      }
    };
  }

  private simulateCommandAck(command: any): void {
    const commandId = command?.command || command?._command;
    
    this.emit('data', {
      header: {
        msgid: 77, // COMMAND_ACK
        seq: this.messageSequence++,
        system_id: 1,
        component_id: 1
      },
      data: {
        command: commandId,
        result: MAV_RESULT.ACCEPTED,
        progress: 100,
        result_param2: 0,
        target_system: 1,
        target_component: 90
      }
    });
  }

  // GPS位置情報をシミュレート
  simulateGlobalPosition(): void {
    this.emit('data', {
      header: {
        msgid: 33, // GLOBAL_POSITION_INT
        seq: this.messageSequence++,
        system_id: 1,
        component_id: 1
      },
      data: {
        time_boot_ms: Date.now(),
        lat: 357696000, // 35.7696° (東京)
        lon: 1397700000, // 139.7700°
        alt: 50000, // 50m MSL
        relative_alt: 10000, // 10m AGL
        vx: 100, // 1m/s East
        vy: 0, // 0m/s North
        vz: -50, // 0.5m/s Up
        hdg: 9000 // 90° (East)
      }
    });
  }

  // システムステータスをシミュレート
  simulateSystemStatus(): void {
    this.emit('data', {
      header: {
        msgid: 1, // SYS_STATUS
        seq: this.messageSequence++,
        system_id: 1,
        component_id: 1
      },
      data: {
        onboard_control_sensors_present: 1234567,
        onboard_control_sensors_enabled: 1234567,
        onboard_control_sensors_health: 1234567,
        load: 500, // 50% CPU
        voltage_battery: 12600, // 12.6V
        current_battery: 5000, // 5A
        battery_remaining: 75, // 75%
        drop_rate_comm: 0,
        errors_comm: 0,
        errors_count1: 0,
        errors_count2: 0,
        errors_count3: 0,
        errors_count4: 0
      }
    });
  }

  // GPS RAWデータをシミュレート
  simulateGpsRaw(): void {
    this.emit('data', {
      header: {
        msgid: 24, // GPS_RAW_INT
        seq: this.messageSequence++,
        system_id: 1,
        component_id: 1
      },
      data: {
        time_usec: Date.now() * 1000,
        fix_type: GPS_FIX_TYPE.GPS_3D_FIX,
        lat: 357696000,
        lon: 1397700000,
        alt: 50000,
        eph: 120, // HDOP 1.2
        epv: 150, // VDOP 1.5
        vel: 100, // 1m/s
        cog: 9000, // 90°
        satellites_visible: 12
      }
    });
  }

  // エラー状況をシミュレート
  simulateError(errorMessage: string): void {
    this.emit('error', new Error(errorMessage));
  }

  // 接続状態を取得
  isConnected(): boolean {
    return this.connected;
  }
}

// common.CommandLongのモック
export const mockCommandLong = {
  create: () => ({
    command: 0,
    _param1: 0,
    _param2: 0,
    _param3: 0,
    _param4: 0,
    _param5: 0,
    _param6: 0,
    _param7: 0,
    targetSystem: 1,
    targetComponent: 1
  })
};

// minimal.HeartbeatやMavCmdのモック
export const mockMinimal = {
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
};

export const mockCommon = {
  MavCmd: {
    COMPONENT_ARM_DISARM: 400,
    NAV_TAKEOFF: 22,
    DO_SET_MODE: 176
  },
  CommandLong: function() {
    return mockCommandLong.create();
  }
};