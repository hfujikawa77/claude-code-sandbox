import type { ArduPilotConnectionConfig, ConnectionStatus } from './types.js';
import type { 
  MAVLinkHeartbeat, 
  MAVLinkGlobalPositionInt, 
  MAVLinkCommandAck,
  MAVLinkCommandLong,
  ProcessedPosition,
  ProcessedStatus,
  CommandResult
} from './mavlink-types.js';
import { MAVLinkConverter, MAV_CMD, MAV_RESULT } from './mavlink-types.js';

export class ArduPilotConnection {
  private config: ArduPilotConnectionConfig;
  private connection: any = null;

  constructor(config: Partial<ArduPilotConnectionConfig> = {}) {
    this.config = {
      host: '127.0.0.1',
      port: 14552,
      protocol: 'udp',
      sourceSystem: 1,
      sourceComponent: 90,
      timeout: 10000,
      autoReconnect: true,
      ...config
    };
  }

  async connect(): Promise<ConnectionStatus> {
    try {
      console.log(`ArduPilotに接続中... (${this.config.protocol}:${this.config.host}:${this.config.port})`);
      
      // Note: node-mavlink connection implementation will be added here
      // For now, returning a placeholder implementation
      
      return {
        connected: true,
        targetSystem: 1,
        targetComponent: 1
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`接続エラー: ${errorMessage}`);
      console.error('接続設定を確認してください:');
      console.error('- SITL/実機が起動しているか');
      console.error(`- ポート番号が正しいか (${this.config.port})`);
      console.error('- ファイアウォール設定');
      
      return {
        connected: false,
        error: errorMessage
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      // Close connection implementation
      this.connection = null;
      console.log('ArduPilot接続を切断しました');
    }
  }

  async waitHeartbeat(timeout?: number): Promise<boolean> {
    const waitTime = timeout || this.config.timeout;
    
    try {
      // Heartbeat waiting implementation will be added here
      console.log(`ハートビート待機中... (タイムアウト: ${waitTime}ms)`);
      
      // Placeholder implementation
      return true;
    } catch (error) {
      console.error(`ハートビート待機でエラー: ${error}`);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  getTargetSystem(): number | undefined {
    return this.connection?.target_system;
  }

  getTargetComponent(): number | undefined {
    return this.connection?.target_component;
  }

  // MAVLink message handling methods (placeholder implementations)
  async receiveHeartbeat(timeout: number = 5000): Promise<MAVLinkHeartbeat | null> {
    // Placeholder for receiving HEARTBEAT message
    console.log(`Waiting for HEARTBEAT message (timeout: ${timeout}ms)`);
    return null;
  }

  async receiveGlobalPositionInt(timeout: number = 5000): Promise<MAVLinkGlobalPositionInt | null> {
    // Placeholder for receiving GLOBAL_POSITION_INT message
    console.log(`Waiting for GLOBAL_POSITION_INT message (timeout: ${timeout}ms)`);
    return null;
  }

  async sendCommandLong(command: MAVLinkCommandLong): Promise<CommandResult> {
    // Placeholder for sending COMMAND_LONG message
    console.log(`Sending COMMAND_LONG: ${command.command}`);
    return {
      success: true,
      result: MAV_RESULT.MAV_RESULT_ACCEPTED,
      message: 'Command sent successfully'
    };
  }

  async waitForCommandAck(command: MAV_CMD, timeout: number = 10000): Promise<MAVLinkCommandAck | null> {
    // Placeholder for waiting for COMMAND_ACK message
    console.log(`Waiting for COMMAND_ACK for command ${command} (timeout: ${timeout}ms)`);
    return null;
  }

  // High-level command methods
  async armMotors(): Promise<CommandResult> {
    const command: MAVLinkCommandLong = {
      target_system: this.getTargetSystem() || 1,
      target_component: this.getTargetComponent() || 1,
      command: MAV_CMD.MAV_CMD_COMPONENT_ARM_DISARM,
      confirmation: 0,
      param1: 1, // 1 to arm, 0 to disarm
      param2: 0,
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0
    };
    
    return await this.sendCommandLong(command);
  }

  async disarmMotors(): Promise<CommandResult> {
    const command: MAVLinkCommandLong = {
      target_system: this.getTargetSystem() || 1,
      target_component: this.getTargetComponent() || 1,
      command: MAV_CMD.MAV_CMD_COMPONENT_ARM_DISARM,
      confirmation: 0,
      param1: 0, // 1 to arm, 0 to disarm
      param2: 0,
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0
    };
    
    return await this.sendCommandLong(command);
  }

  async takeoff(altitude: number): Promise<CommandResult> {
    const command: MAVLinkCommandLong = {
      target_system: this.getTargetSystem() || 1,
      target_component: this.getTargetComponent() || 1,
      command: MAV_CMD.MAV_CMD_NAV_TAKEOFF,
      confirmation: 0,
      param1: 0, // Minimum pitch
      param2: 0, // Empty
      param3: 0, // Empty
      param4: 0, // Yaw angle
      param5: 0, // Latitude
      param6: 0, // Longitude
      param7: altitude // Altitude
    };
    
    return await this.sendCommandLong(command);
  }

  async setFlightMode(modeId: number): Promise<CommandResult> {
    const command: MAVLinkCommandLong = {
      target_system: this.getTargetSystem() || 1,
      target_component: this.getTargetComponent() || 1,
      command: MAV_CMD.MAV_CMD_DO_SET_MODE,
      confirmation: 0,
      param1: 1, // MAV_MODE_FLAG_CUSTOM_MODE_ENABLED
      param2: modeId, // Custom mode
      param3: 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0
    };
    
    return await this.sendCommandLong(command);
  }

  // Data processing methods
  async getProcessedStatus(): Promise<ProcessedStatus | null> {
    const heartbeat = await this.receiveHeartbeat();
    if (!heartbeat) {
      return null;
    }

    return {
      armed: (heartbeat.base_mode & 128) !== 0, // MAV_MODE_FLAG_SAFETY_ARMED
      mode: MAVLinkConverter.getFlightModeName(heartbeat.custom_mode),
      modeId: heartbeat.custom_mode,
      systemStatus: heartbeat.system_status,
      timestamp: Date.now()
    };
  }

  async getProcessedPosition(): Promise<ProcessedPosition | null> {
    const position = await this.receiveGlobalPositionInt();
    if (!position) {
      return null;
    }

    return {
      latitude: MAVLinkConverter.milliDegreesToDegrees(position.lat),
      longitude: MAVLinkConverter.milliDegreesToDegrees(position.lon),
      altitude: MAVLinkConverter.millimetersToMeters(position.alt),
      relativeAlt: MAVLinkConverter.millimetersToMeters(position.relative_alt),
      heading: MAVLinkConverter.centiDegreesToDegrees(position.hdg),
      velocity: {
        x: MAVLinkConverter.centimetersPerSecondToMetersPerSecond(position.vx),
        y: MAVLinkConverter.centimetersPerSecondToMetersPerSecond(position.vy),
        z: MAVLinkConverter.centimetersPerSecondToMetersPerSecond(position.vz)
      },
      timestamp: position.time_boot_ms
    };
  }
}