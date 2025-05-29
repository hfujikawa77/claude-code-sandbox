import { MavEsp8266 } from 'node-mavlink';
import { EventEmitter } from 'events';
import { MavLinkData, minimal } from 'mavlink-mappings';
import { 
  ErrorFactory, 
  ArduPilotErrorCode, 
  ErrorHandler, 
  TimeoutPromise,
  ConnectionError,
  TimeoutError 
} from './errors.js';

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
      
      // 接続プールから既存の接続を再利用
      let existingConnection = this.connectionPool.get(connectionKey);
      if (existingConnection) {
        this.connection = existingConnection;
      } else {
        this.connection = new MavEsp8266();
        this.connectionPool.set(connectionKey, this.connection);
      }

      this.setupEventHandlers();
      
      // タイムアウト付きで接続を開始
      const connectPromise = this.connection.start(
        this.config.port, 
        this.config.port, 
        this.config.host
      );
      
      await TimeoutPromise.create(
        connectPromise,
        this.config.timeoutMs,
        `ArduPilotへの接続がタイムアウトしました（${this.config.timeoutMs}ms）`
      );
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connected');

    } catch (error: any) {
      // エラーを適切にハンドリング
      let handledError = error;
      
      if (error instanceof TimeoutError) {
        handledError = ErrorFactory.createTimeoutError(
          `ArduPilotへの接続がタイムアウトしました（${this.config.timeoutMs}ms）`,
          this.config.timeoutMs,
          ArduPilotErrorCode.CONNECTION_TIMEOUT
        );
      } else if (!(error instanceof ConnectionError)) {
        handledError = ErrorFactory.createConnectionError(
          `ArduPilotへの接続に失敗しました: ${error.message}`,
          ArduPilotErrorCode.CONNECTION_FAILED,
          { 
            host: this.config.host, 
            port: this.config.port,
            originalError: error.message 
          }
        );
      }

      this.emit('error', handledError);
      
      // 自動再接続の実行
      if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
      
      throw handledError;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.stopReconnectTimer();
    
    if (this.connection) {
      try {
        await TimeoutPromise.create(
          this.connection.close(),
          5000, // 5秒でタイムアウト
          '接続の切断がタイムアウトしました'
        );
      } catch (error) {
        ErrorHandler.log(ErrorFactory.createConnectionError(
          `切断中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
          ArduPilotErrorCode.CONNECTION_FAILED
        ));
      }
    }
    
    this.isConnected = false;
    this.connection = null;
    this.emit('disconnected');
  }

  /**
   * リソースのクリーンアップ（finally句で使用）
   */
  async cleanup(): Promise<void> {
    try {
      await this.disconnect();
      
      // 接続プールのクリーンアップ
      for (const [key, connection] of this.connectionPool.entries()) {
        try {
          await connection.close();
        } catch (error) {
          ErrorHandler.log(ErrorFactory.createConnectionError(
            `接続プール ${key} のクリーンアップ中にエラーが発生しました`,
            ArduPilotErrorCode.CONNECTION_FAILED
          ));
        }
      }
      this.connectionPool.clear();
      
      // すべてのタイマーをクリア
      this.stopHeartbeat();
      this.stopReconnectTimer();
      
    } catch (error) {
      ErrorHandler.log(ErrorFactory.createConnectionError(
        `クリーンアップ中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        ArduPilotErrorCode.CONNECTION_FAILED
      ));
    }
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
      const heartbeatError = ErrorFactory.createConnectionError(
        `ハートビート送信エラー: ${error instanceof Error ? error.message : String(error)}`,
        ArduPilotErrorCode.HEARTBEAT_TIMEOUT
      );
      this.emit('error', heartbeatError);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      const maxReconnectError = ErrorFactory.createConnectionError(
        `最大再接続試行回数に達しました（${this.config.maxReconnectAttempts}回）`,
        ArduPilotErrorCode.CONNECTION_FAILED,
        { 
          attempts: this.reconnectAttempts,
          maxAttempts: this.config.maxReconnectAttempts 
        }
      );
      this.emit('error', maxReconnectError);
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        // エラーハンドリングはconnectメソッドで実行済み
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
      throw ErrorFactory.createConnectionError(
        'ArduPilotに接続されていません',
        ArduPilotErrorCode.CONNECTION_LOST,
        { 
          isConnected: this.isConnected,
          connectionExists: !!this.connection 
        }
      );
    }

    try {
      // タイムアウト付きでメッセージを送信
      const sendPromise = this.connection.send(
        message, 
        this.config.sourceSystem, 
        this.config.sourceComponent
      );
      
      await TimeoutPromise.create(
        sendPromise,
        this.config.timeoutMs,
        'メッセージ送信がタイムアウトしました'
      );
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw ErrorFactory.createTimeoutError(
          'メッセージ送信がタイムアウトしました',
          this.config.timeoutMs,
          ArduPilotErrorCode.COMMAND_TIMEOUT
        );
      } else {
        throw ErrorFactory.createConnectionError(
          `メッセージ送信エラー: ${error instanceof Error ? error.message : String(error)}`,
          ArduPilotErrorCode.COMMAND_FAILED
        );
      }
    }
  }

  getConnectionStatus(): {
    isConnected: boolean;
    host: string;
    port: number;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    autoReconnect: boolean;
  } {
    return {
      isConnected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      autoReconnect: this.config.autoReconnect
    };
  }

  /**
   * 手動で再接続を実行
   */
  async reconnect(): Promise<void> {
    await this.disconnect();
    this.reconnectAttempts = 0; // リセット
    await this.connect();
  }

  /**
   * ヘルスチェック
   */
  isHealthy(): boolean {
    return this.isConnected && 
           !!this.connection && 
           this.reconnectAttempts < this.config.maxReconnectAttempts;
  }
}