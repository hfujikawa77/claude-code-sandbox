import { MavEsp8266 } from 'node-mavlink';
import { EventEmitter } from 'events';
import { MavLinkData, minimal } from 'mavlink-mappings';

export interface ConnectionConfig {
  host: string;
  port: number;
  sourceSystem: number;
  sourceComponent: number;
  timeoutMs: number;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectInterval: number;
}

export interface HeartbeatData {
  autopilot: number;
  type: number;
  systemStatus: number;
  baseMode: number;
  customMode: number;
  mavlinkVersion: number;
}

export class ArduPilotConnection extends EventEmitter {
  private connection: MavEsp8266 | null = null;
  private config: ConnectionConfig;
  private isConnected = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private connectionPool: Map<string, MavEsp8266> = new Map();

  constructor(config: Partial<ConnectionConfig> = {}) {
    super();
    this.config = {
      host: '127.0.0.1',
      port: 14552,
      sourceSystem: 1,
      sourceComponent: 90,
      timeoutMs: 10000,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectInterval: 5000,
      ...config
    };
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const connectionKey = `${this.config.host}:${this.config.port}`;
      
      // Try to reuse existing connection from pool
      let existingConnection = this.connectionPool.get(connectionKey);
      if (existingConnection) {
        this.connection = existingConnection;
      } else {
        this.connection = new MavEsp8266();
        this.connectionPool.set(connectionKey, this.connection);
      }

      this.setupEventHandlers();
      
      // Start the MavEsp8266 connection
      await this.connection.start(this.config.port, this.config.port, this.config.host);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connected');

    } catch (error: any) {
      this.emit('error', error);
      if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.stopReconnectTimer();
    
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        console.error('切断中にエラーが発生しました:', error);
      }
    }
    
    this.isConnected = false;
    this.connection = null;
    this.emit('disconnected');
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('data', (packet: any) => {
      if (packet.header?.msgid === 0) { // HEARTBEAT message ID
        const heartbeatData: HeartbeatData = {
          autopilot: packet.data?.autopilot || 0,
          type: packet.data?.type || 0,
          systemStatus: packet.data?.system_status || 0,
          baseMode: packet.data?.base_mode || 0,
          customMode: packet.data?.custom_mode || 0,
          mavlinkVersion: packet.data?.mavlink_version || 3
        };
        this.emit('heartbeat', heartbeatData);
      }
      this.emit('message', packet);
    });

    this.connection.on('error', (error: any) => {
      this.emit('error', error);
      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 1000); // Send heartbeat every second
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendHeartbeat(): void {
    if (!this.connection || !this.isConnected) return;

    try {
      const heartbeat = new minimal.Heartbeat();
      heartbeat.type = minimal.MavType.GCS; // Ground Control Station
      heartbeat.autopilot = minimal.MavAutopilot.INVALID;
      heartbeat.baseMode = minimal.MavModeFlag.CUSTOM_MODE_ENABLED;
      heartbeat.customMode = 0;
      heartbeat.systemStatus = minimal.MavState.ACTIVE;
      heartbeat.mavlinkVersion = 3;

      this.connection.send(heartbeat, this.config.sourceSystem, this.config.sourceComponent);
    } catch (error) {
      this.emit('error', new Error(`ハートビート送信エラー: ${error}`));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      this.emit('error', new Error('最大再接続試行回数に達しました'));
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        // Error handling is done in connect method
      }
    }, this.config.reconnectInterval);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async sendMessage(message: MavLinkData): Promise<void> {
    if (!this.connection || !this.isConnected) {
      throw new Error('ArduPilotに接続されていません');
    }

    try {
      await this.connection.send(message, this.config.sourceSystem, this.config.sourceComponent);
    } catch (error) {
      throw new Error(`メッセージ送信エラー: ${error}`);
    }
  }

  getConnectionStatus(): {
    isConnected: boolean;
    host: string;
    port: number;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Clean up all connections in the pool
  async cleanup(): Promise<void> {
    await this.disconnect();
    
    for (const [key, connection] of this.connectionPool) {
      try {
        await connection.close();
      } catch (error) {
        console.error(`プール接続 ${key} の切断エラー:`, error);
      }
    }
    
    this.connectionPool.clear();
  }
}