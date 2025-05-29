/**
 * ArduPilot MCP Server Implementation
 * Model Context Protocol (MCP) server for ArduPilot drone control
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { ArduPilotConnection } from './connection.js';
import { ArduPilotMCPTools } from './mcp-tools.js';
import {
  ArmToolParams,
  DisarmToolParams,
  TakeoffToolParams,
  ChangeModeToolParams,
  GetStatusToolParams,
  GetPositionToolParams,
  MCPToolResult,
  DEFAULT_CONNECTION_CONFIG
} from './types.js';

export class ArduPilotMcpServer {
  private server: Server;
  private connection: ArduPilotConnection;
  private tools: ArduPilotMCPTools;

  constructor() {
    this.server = new Server(
      {
        name: 'ardupilot-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.connection = new ArduPilotConnection(DEFAULT_CONNECTION_CONFIG);
    this.tools = new ArduPilotMCPTools(this.connection);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // ツール一覧の処理
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'arm',
            description: 'モーターをアームします（武装状態にします）',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'disarm',
            description: 'モーターをディスアームします（非武装状態にします）',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'takeoff',
            description: '指定された高度で離陸します',
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
            name: 'change_mode',
            description: 'フライトモードを変更します',
            inputSchema: {
              type: 'object',
              properties: {
                mode: {
                  type: 'string',
                  description: 'フライトモード名',
                  enum: [
                    'STABILIZE', 'ACRO', 'ALT_HOLD', 'AUTO', 'GUIDED', 'LOITER',
                    'RTL', 'CIRCLE', 'LAND', 'DRIFT', 'SPORT', 'FLIP', 'AUTOTUNE',
                    'POSHOLD', 'BRAKE', 'THROW', 'AVOID_ADSB', 'GUIDED_NOGPS',
                    'SMART_RTL', 'FLOWHOLD', 'FOLLOW', 'ZIGZAG', 'SYSTEMID',
                    'AUTOROTATE', 'AUTO_RTL'
                  ]
                }
              },
              required: ['mode']
            }
          },
          {
            name: 'get_status',
            description: '機体のステータス情報を取得します（アーム状態、フライトモード、システムステータス）',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'get_position',
            description: '機体の位置情報を取得します（GPS位置、高度、ヘディング、速度）',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      };
    });

    // ツール実行の処理
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: MCPToolResult;

        switch (name) {
          case 'arm':
            result = await this.tools.arm(args as ArmToolParams);
            break;

          case 'disarm':
            result = await this.tools.disarm(args as DisarmToolParams);
            break;

          case 'takeoff':
            result = await this.tools.takeoff(args as TakeoffToolParams);
            break;

          case 'change_mode':
            if (!args || typeof args !== 'object' || !('mode' in args)) {
              throw new McpError(ErrorCode.InvalidParams, 'mode パラメータが必要です');
            }
            result = await this.tools.changeMode(args as unknown as ChangeModeToolParams);
            break;

          case 'get_status':
            result = await this.tools.getStatus(args as GetStatusToolParams);
            break;

          case 'get_position':
            result = await this.tools.getPosition(args as GetPositionToolParams);
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `不明なツール: ${name}`
            );
        }

        // 結果をMCP形式で返す
        if (result.success) {
          // 成功時のレスポンス
          return {
            content: [
              {
                type: 'text',
                text: result.message
              },
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } else {
          // エラー時のレスポンス
          return {
            content: [
              {
                type: 'text',
                text: `エラー: ${result.message}`
              }
            ],
            isError: true
          };
        }

      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `ツール実行エラー: ${error.message}`
        );
      }
    });

    // エラーハンドリング
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    // 接続イベントハンドリング
    this.connection.on('connected', () => {
      console.log('ArduPilotに接続しました');
    });

    this.connection.on('disconnected', () => {
      console.log('ArduPilotから切断されました');
    });

    this.connection.on('error', (error) => {
      console.error('接続エラー:', error);
    });

    this.connection.on('heartbeat', (data) => {
      console.log('ハートビート受信:', {
        armed: (data.baseMode & 128) !== 0,
        mode: data.customMode,
        status: data.systemStatus
      });
    });
  }

  async start(): Promise<void> {
    try {
      // ArduPilotに接続
      await this.connection.connect();
      console.log('ArduPilot接続が確立されました');

      // MCPサーバーを開始
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('ArduPilot MCP Serverが起動しました');

    } catch (error: any) {
      console.error('サーバー起動エラー:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('サーバーを停止しています...');
      
      // 接続をクリーンアップ
      await this.connection.cleanup();
      
      // サーバーを停止
      await this.server.close();
      
      console.log('サーバーが正常に停止されました');
    } catch (error: any) {
      console.error('サーバー停止エラー:', error);
      throw error;
    }
  }

  // ヘルパーメソッド
  getConnectionStatus() {
    return this.connection.getConnectionStatus();
  }

  async reconnect(): Promise<void> {
    await this.connection.cleanup();
    await this.connection.connect();
  }
}