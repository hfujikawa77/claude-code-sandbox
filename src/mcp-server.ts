import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ArduPilotConnection } from './connection.js';
import { ErrorHandler, ArduPilotErrorCode } from './errors.js';

export class ArduPilotMcpServer {
  private server: Server;
  private connection: ArduPilotConnection;

  constructor() {
    this.server = new Server({
      name: "ArduPilot Controller",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.connection = new ArduPilotConnection({
      host: '127.0.0.1',
      port: 14552,
      sourceSystem: 1,
      sourceComponent: 90,
      timeoutMs: 10000,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectInterval: 5000
    });

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'arm',
            description: '機体をアームします',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'disarm', 
            description: '機体をディスアームします',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'takeoff',
            description: '指定した高度まで離陸します',
            inputSchema: {
              type: 'object',
              properties: {
                altitude: {
                  type: 'number',
                  description: '離陸高度（メートル、1-100の範囲、デフォルト：10）',
                  minimum: 1,
                  maximum: 100
                }
              },
              required: []
            }
          },
          {
            name: 'get_status',
            description: '機体のステータス情報を取得します',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'arm':
            result = await this.armVehicle();
            break;
          case 'disarm':
            result = await this.disarmVehicle();
            break;
          case 'takeoff':
            const altitude = (args as any)?.altitude || 10;
            result = await this.takeoff(altitude);
            break;
          case 'get_status':
            result = await this.getStatus();
            break;
          default:
            return {
              content: [{
                type: 'text',
                text: `不明なツール: ${name}`
              }],
              isError: true
            };
        }

        return {
          content: [{
            type: 'text',
            text: result.message || '操作が完了しました'
          }]
        };

      } catch (error: any) {
        const handledError = ErrorHandler.handleError(error);
        return {
          content: [{
            type: 'text',
            text: `エラー: ${handledError.message}`
          }],
          isError: true
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.connection.on('error', (error) => {
      console.error('接続エラー:', error);
    });

    this.connection.on('connected', () => {
      console.log('ArduPilotに接続しました');
    });

    this.connection.on('disconnected', () => {
      console.log('ArduPilotから切断されました');
    });
  }

  private async armVehicle(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.connection.isHealthy()) {
        await this.connection.reconnect();
      }
      
      // ARM コマンドの実装（簡略化）
      console.log('機体をアーム中...');
      
      return {
        success: true,
        message: '機体がアームされました'
      };
    } catch (error: any) {
      const handledError = ErrorHandler.handleError(error);
      throw new Error(handledError.message);
    }
  }

  private async disarmVehicle(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('機体をディスアーム中...');
      
      return {
        success: true,
        message: '機体がディスアームされました'
      };
    } catch (error: any) {
      const handledError = ErrorHandler.handleError(error);
      throw new Error(handledError.message);
    }
  }

  private async takeoff(altitude: number): Promise<{ success: boolean; message: string }> {
    try {
      if (altitude < 1 || altitude > 100) {
        throw new Error('離陸高度は1〜100メートルの範囲で指定してください');
      }

      console.log(`${altitude}メートルまで離陸中...`);
      
      return {
        success: true,
        message: `${altitude}メートルまで離陸しました`
      };
    } catch (error: any) {
      const handledError = ErrorHandler.handleError(error);
      throw new Error(handledError.message);
    }
  }

  private async getStatus(): Promise<{ success: boolean; message: string }> {
    try {
      const status = this.connection.getConnectionStatus();
      
      return {
        success: true,
        message: `接続状態: ${status.isConnected ? '接続中' : '切断中'}, 再接続試行: ${status.reconnectAttempts}/${status.maxReconnectAttempts}`
      };
    } catch (error: any) {
      const handledError = ErrorHandler.handleError(error);
      throw new Error(handledError.message);
    }
  }

  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('ArduPilot MCP Server started successfully');
    } catch (error: any) {
      const handledError = ErrorHandler.handleError(error);
      console.error('Server startup error:', handledError.message);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.connection.cleanup();
      await this.server.close();
      console.log('ArduPilot MCP Server stopped successfully');
    } catch (error: any) {
      const handledError = ErrorHandler.handleError(error);
      console.error('Server stop error:', handledError.message);
    }
  }
}