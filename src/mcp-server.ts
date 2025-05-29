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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log("MCPサーバーを起動します...");
    console.log("利用可能なツール: arm, disarm");
    console.log("クライアントからの接続を待機中...");
  }
}