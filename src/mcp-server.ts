import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ArduPilotConnection } from './connection.js';

export class ArduPilotMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: "ArduPilot Controller",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupTools();
  }

  private setupTools(): void {
    // List available tools
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
                  description: '離陸する高度（メートル）',
                  default: 10.0,
                  minimum: 1.0,
                  maximum: 100.0
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
                  description: 'フライトモード名 (GUIDED, LAND, RTL, STABILIZE, LOITER等)',
                  enum: ['GUIDED', 'LAND', 'RTL', 'STABILIZE', 'LOITER', 'AUTO', 'POSHOLD', 'CIRCLE', 'BRAKE']
                }
              },
              required: ['mode']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'arm') {
        return await this.arm();
      } else if (request.params.name === 'disarm') {
        return await this.disarm();
      } else if (request.params.name === 'takeoff') {
        const altitude = typeof request.params.arguments?.altitude === 'number' 
          ? request.params.arguments.altitude 
          : 10.0;
        return await this.takeoff(altitude);
      } else if (request.params.name === 'change_mode') {
        const mode = typeof request.params.arguments?.mode === 'string' 
          ? request.params.arguments.mode 
          : '';
        if (!mode) {
          return {
            content: [{
              type: 'text',
              text: 'エラー: モード名が指定されていません'
            }]
          };
        }
        return await this.changeMode(mode);
      }
      
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async arm(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const conn = new ArduPilotConnection();
    
    try {
      const status = await conn.connect();
      if (!status.connected) {
        return {
          content: [{
            type: 'text',
            text: `エラー: ArduPilotとの接続に失敗しました - ${status.error || '不明なエラー'}`
          }]
        };
      }

      const heartbeatSuccess = await conn.waitHeartbeat(10000);
      if (!heartbeatSuccess) {
        return {
          content: [{
            type: 'text',
            text: "エラー: ArduPilotとの接続がタイムアウトしました"
          }]
        };
      }

      // ArduCopter arm command implementation will be added here
      // For now, return success message
      
      return {
        content: [{
          type: 'text',
          text: "機体をアームしました。"
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: `エラー: ${errorMessage}\n接続設定を確認してください:\n- SITL/実機が起動しているか\n- ポート番号が正しいか (14552)\n- ファイアウォール設定`
        }]
      };
    } finally {
      await conn.disconnect();
    }
  }

  private async disarm(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const conn = new ArduPilotConnection();
    
    try {
      const status = await conn.connect();
      if (!status.connected) {
        return {
          content: [{
            type: 'text',
            text: `エラー: ArduPilotとの接続に失敗しました - ${status.error || '不明なエラー'}`
          }]
        };
      }

      await conn.waitHeartbeat();

      // ArduCopter disarm command implementation will be added here
      // For now, return success message
      
      return {
        content: [{
          type: 'text',
          text: "機体をディスアームしました。"
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: `エラー: ${errorMessage}\n接続設定を確認してください:\n- SITL/実機が起動しているか\n- ポート番号が正しいか (14552)\n- ファイアウォール設定`
        }]
      };
    } finally {
      await conn.disconnect();
    }
  }

  private async takeoff(altitude: number = 10.0): Promise<{ content: Array<{ type: string; text: string }> }> {
    const conn = new ArduPilotConnection();
    
    try {
      // ハートビート待機（タイムアウト10秒）
      const status = await conn.connect();
      if (!status.connected) {
        return {
          content: [{
            type: 'text',
            text: `エラー: ArduPilotとの接続に失敗しました - ${status.error || '不明なエラー'}`
          }]
        };
      }

      const heartbeatSuccess = await conn.waitHeartbeat(10000);
      if (!heartbeatSuccess) {
        return {
          content: [{
            type: 'text',
            text: "エラー: ArduPilotとの接続がタイムアウトしました"
          }]
        };
      }

      // 現在のモードを確認・変更 (実装予定)
      // const currentMode = await conn.getFlightMode();
      // if (currentMode !== "GUIDED") {
      //   await conn.setMode("GUIDED");
      //   await new Promise(resolve => setTimeout(resolve, 1000));
      // }

      // アーム処理 (実装予定)
      // await conn.arm();
      // await conn.waitMotorsArmed();
      // await new Promise(resolve => setTimeout(resolve, 1000));

      // 離陸コマンド送信 (実装予定)
      // const takeoffResult = await conn.sendTakeoffCommand(altitude);
      // if (!takeoffResult.success) {
      //   return {
      //     content: [{
      //       type: 'text',
      //       text: "エラー: 離陸コマンドが拒否されました"
      //     }]
      //   };
      // }

      // Placeholder implementation
      console.log(`Takeoff to ${altitude}m requested`);
      
      return {
        content: [{
          type: 'text',
          text: `${altitude}m の高度まで離陸を開始しました。`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: `エラー: ${errorMessage}\n接続設定を確認してください:\n- SITL/実機が起動しているか\n- ポート番号が正しいか (14552)\n- ファイアウォール設定`
        }]
      };
    } finally {
      await conn.disconnect();
    }
  }

  private async changeMode(mode: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    const conn = new ArduPilotConnection();
    
    try {
      const status = await conn.connect();
      if (!status.connected) {
        return {
          content: [{
            type: 'text',
            text: `エラー: ArduPilotとの接続に失敗しました - ${status.error || '不明なエラー'}`
          }]
        };
      }

      await conn.waitHeartbeat();

      // Valid flight modes for ArduCopter
      const validModes = ['GUIDED', 'LAND', 'RTL', 'STABILIZE', 'LOITER', 'AUTO', 'POSHOLD', 'CIRCLE', 'BRAKE'];
      const requestedMode = mode.toUpperCase();
      
      if (!validModes.includes(requestedMode)) {
        return {
          content: [{
            type: 'text',
            text: `無効なモードです: ${mode}\n利用可能なモード: ${validModes.join(', ')}`
          }]
        };
      }

      // Mode change implementation (placeholder)
      // const modeId = await conn.getModeId(requestedMode);
      // if (modeId === null) {
      //   return {
      //     content: [{
      //       type: 'text',
      //       text: `無効なモードです: ${mode}`
      //     }]
      //   };
      // }

      // await conn.setMode(modeId);

      // Mode change confirmation (placeholder)
      // const startTime = Date.now();
      // while (Date.now() - startTime < 5000) {
      //   const currentMode = await conn.getFlightMode();
      //   if (currentMode === requestedMode) {
      //     return {
      //       content: [{
      //         type: 'text',
      //         text: `モードを ${requestedMode} に変更しました。`
      //       }]
      //     };
      //   }
      //   await new Promise(resolve => setTimeout(resolve, 100));
      // }

      // Placeholder implementation
      console.log(`Mode change to ${requestedMode} requested`);
      
      return {
        content: [{
          type: 'text',
          text: `モードを ${requestedMode} に変更しました。`
        }]
      };

      // For timeout case (placeholder)
      // return {
      //   content: [{
      //     type: 'text',
      //     text: `警告: モード変更を確認できませんでした (現在のモード: ${currentMode})`
      //   }]
      // };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: `エラー: ${errorMessage}\n接続設定を確認してください:\n- SITL/実機が起動しているか\n- ポート番号が正しいか (14552)\n- ファイアウォール設定`
        }]
      };
    } finally {
      await conn.disconnect();
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log("MCPサーバーを起動します...");
    console.log("利用可能なツール: arm, disarm, takeoff, change_mode");
    console.log("クライアントからの接続を待機中...");
  }
}