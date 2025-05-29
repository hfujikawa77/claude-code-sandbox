/**
 * MCPサーバー統合テスト
 * ArduPilotMcpServer全体の動作をエンドツーエンドでテスト
 */

import { ArduPilotMcpServer } from '../../src/mcp-server.js';
import { MockMavEsp8266 } from '../mocks/mavlink-mock.js';
import { MAV_RESULT, COPTER_MODE } from '../../src/mavlink-types.js';

// モックの設定
jest.mock('node-mavlink', () => ({
  MavEsp8266: MockMavEsp8266
}));

jest.mock('../../src/errors.js', () => require('../mocks/errors-mock.js'));

jest.mock('mavlink-mappings', () => ({
  minimal: {
    MavModeFlag: {
      SAFETY_ARMED: 128,
      CUSTOM_MODE_ENABLED: 1
    },
    MavState: {
      ACTIVE: 4
    },
    Heartbeat: function() {
      return {
        type: 2,
        autopilot: 3,
        baseMode: 0,
        customMode: 0,
        systemStatus: 4,
        mavlinkVersion: 3
      };
    }
  },
  common: {
    MavCmd: {
      COMPONENT_ARM_DISARM: 400,
      NAV_TAKEOFF: 22,
      DO_SET_MODE: 176
    },
    CommandLong: function() {
      return {
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
      };
    }
  }
}));

// MCPSDKのモック
const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn(),
  close: jest.fn(),
  onerror: null
};

const mockTransport = {
  start: jest.fn(),
  close: jest.fn()
};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn(() => mockServer)
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(() => mockTransport)
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: 'CallToolRequestSchema',
  ListToolsRequestSchema: 'ListToolsRequestSchema',
  ErrorCode: {
    MethodNotFound: 'MethodNotFound',
    InvalidParams: 'InvalidParams',
    InternalError: 'InternalError'
  },
  McpError: class McpError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
}));

describe('ArduPilotMcpServer 統合テスト', () => {
  let server: ArduPilotMcpServer;
  let mockMavEsp8266: MockMavEsp8266;

  beforeEach(async () => {
    // モックをリセット
    jest.clearAllMocks();
    
    // サーバーインスタンスを作成
    server = new ArduPilotMcpServer();
    mockMavEsp8266 = new MockMavEsp8266();
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch {
      // 停止エラーは無視
    }
    
    if (mockMavEsp8266.isConnected()) {
      await mockMavEsp8266.close();
    }
  });

  describe('サーバー起動・停止', () => {
    it('正常にサーバーを起動できる', async () => {
      mockServer.connect.mockResolvedValue(undefined);
      
      await expect(server.start()).resolves.not.toThrow();
      
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2); // ListTools, CallTool
      expect(mockServer.connect).toHaveBeenCalledTimes(1);
    });

    it('正常にサーバーを停止できる', async () => {
      mockServer.connect.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);
      
      await server.start();
      await expect(server.stop()).resolves.not.toThrow();
      
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    it('接続エラー時も適切にハンドリングする', async () => {
      mockServer.connect.mockRejectedValue(new Error('接続失敗'));
      
      await expect(server.start()).rejects.toThrow('接続失敗');
    });
  });

  describe('ツール一覧取得', () => {
    it('利用可能なツール一覧を返す', async () => {
      let listToolsHandler: Function;
      
      mockServer.setRequestHandler.mockImplementation((schema: string, handler: Function) => {
        if (schema === 'ListToolsRequestSchema') {
          listToolsHandler = handler;
        }
      });
      
      // サーバーを起動してハンドラーを設定
      await server.start();
      
      // ツール一覧を取得
      const result = await listToolsHandler();
      
      expect(result.tools).toBeDefined();
      expect(result.tools).toHaveLength(6);
      
      const toolNames = result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('arm');
      expect(toolNames).toContain('disarm');
      expect(toolNames).toContain('takeoff');
      expect(toolNames).toContain('change_mode');
      expect(toolNames).toContain('get_status');
      expect(toolNames).toContain('get_position');
    });

    it('各ツールが適切な説明を持つ', async () => {
      let listToolsHandler: Function;
      
      mockServer.setRequestHandler.mockImplementation((schema: string, handler: Function) => {
        if (schema === 'ListToolsRequestSchema') {
          listToolsHandler = handler;
        }
      });
      
      await server.start();
      const result = await listToolsHandler();
      
      const armTool = result.tools.find((tool: any) => tool.name === 'arm');
      expect(armTool.description).toContain('モーターをアーム');
      
      const takeoffTool = result.tools.find((tool: any) => tool.name === 'takeoff');
      expect(takeoffTool.inputSchema.properties.altitude).toBeDefined();
      expect(takeoffTool.inputSchema.properties.altitude.minimum).toBe(1);
      expect(takeoffTool.inputSchema.properties.altitude.maximum).toBe(100);
    });
  });

  describe('ツール実行', () => {
    let callToolHandler: Function;

    beforeEach(async () => {
      mockServer.setRequestHandler.mockImplementation((schema: string, handler: Function) => {
        if (schema === 'CallToolRequestSchema') {
          callToolHandler = handler;
        }
      });
      
      await server.start();
    });

    describe('armツール', () => {
      it('正常にarmツールを実行できる', async () => {
        // モックツールが成功を返すように設定
        jest.spyOn(server as any, 'tools').mockReturnValue({
          arm: jest.fn().mockResolvedValue({
            success: true,
            message: 'モーターのアームが完了しました',
            result: MAV_RESULT.ACCEPTED
          })
        });

        const request = {
          params: {
            name: 'arm',
            arguments: {}
          }
        };

        const result = await callToolHandler(request);

        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('モーターのアームが完了しました');
      });

      it('armツール失敗時にエラーレスポンスを返す', async () => {
        jest.spyOn(server as any, 'tools').mockReturnValue({
          arm: jest.fn().mockResolvedValue({
            success: false,
            message: '接続されていません'
          })
        });

        const request = {
          params: {
            name: 'arm',
            arguments: {}
          }
        };

        const result = await callToolHandler(request);

        expect(result.content[0].text).toContain('エラー: 接続されていません');
        expect(result.isError).toBe(true);
      });
    });

    describe('takeoffツール', () => {
      it('正常にtakeoffツールを実行できる', async () => {
        jest.spyOn(server as any, 'tools').mockReturnValue({
          takeoff: jest.fn().mockResolvedValue({
            success: true,
            message: '15メートルでの離陸を開始しました',
            altitude: 15,
            result: MAV_RESULT.ACCEPTED
          })
        });

        const request = {
          params: {
            name: 'takeoff',
            arguments: { altitude: 15 }
          }
        };

        const result = await callToolHandler(request);

        expect(result.content[0].text).toContain('15メートルでの離陸を開始しました');
        expect(JSON.parse(result.content[1].text).altitude).toBe(15);
      });
    });

    describe('change_modeツール', () => {
      it('正常にchange_modeツールを実行できる', async () => {
        jest.spyOn(server as any, 'tools').mockReturnValue({
          changeMode: jest.fn().mockResolvedValue({
            success: true,
            message: 'フライトモードをGUIDEDに変更しました',
            mode: 'GUIDED',
            result: MAV_RESULT.ACCEPTED
          })
        });

        const request = {
          params: {
            name: 'change_mode',
            arguments: { mode: 'GUIDED' }
          }
        };

        const result = await callToolHandler(request);

        expect(result.content[0].text).toContain('フライトモードをGUIDEDに変更しました');
      });

      it('無効なmodeパラメータでエラーを返す', async () => {
        const request = {
          params: {
            name: 'change_mode',
            arguments: {} // modeパラメータなし
          }
        };

        await expect(callToolHandler(request)).rejects.toThrow('mode パラメータが必要です');
      });
    });

    describe('get_statusツール', () => {
      it('正常にget_statusツールを実行できる', async () => {
        const mockStatus = {
          armed: true,
          mode: 'GUIDED',
          mode_num: COPTER_MODE.GUIDED,
          system_status: 4,
          battery_voltage: 12.6,
          battery_remaining: 75,
          gps_fix_type: 3,
          satellites_visible: 12
        };

        jest.spyOn(server as any, 'tools').mockReturnValue({
          getStatus: jest.fn().mockResolvedValue({
            success: true,
            message: 'ステータス情報を取得しました',
            status: mockStatus
          })
        });

        const request = {
          params: {
            name: 'get_status',
            arguments: {}
          }
        };

        const result = await callToolHandler(request);

        expect(result.content[0].text).toContain('ステータス情報を取得しました');
        
        const statusData = JSON.parse(result.content[1].text);
        expect(statusData.status.armed).toBe(true);
        expect(statusData.status.mode).toBe('GUIDED');
      });
    });

    describe('get_positionツール', () => {
      it('正常にget_positionツールを実行できる', async () => {
        const mockPosition = {
          latitude: 35.7696,
          longitude: 139.7700,
          altitude_msl: 50,
          altitude_rel: 10,
          heading: 90,
          ground_speed: 1.0,
          vertical_speed: 0.5,
          gps_fix_type: 3,
          satellites_visible: 12
        };

        jest.spyOn(server as any, 'tools').mockReturnValue({
          getPosition: jest.fn().mockResolvedValue({
            success: true,
            message: '位置情報を取得しました',
            position: mockPosition
          })
        });

        const request = {
          params: {
            name: 'get_position',
            arguments: {}
          }
        };

        const result = await callToolHandler(request);

        expect(result.content[0].text).toContain('位置情報を取得しました');
        
        const positionData = JSON.parse(result.content[1].text);
        expect(positionData.position.latitude).toBeCloseTo(35.7696, 4);
        expect(positionData.position.longitude).toBeCloseTo(139.7700, 4);
      });
    });

    it('不明なツール名でエラーを返す', async () => {
      const request = {
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      await expect(callToolHandler(request)).rejects.toThrow('不明なツール: unknown_tool');
    });

    it('ツール実行中の例外を適切にハンドリングする', async () => {
      jest.spyOn(server as any, 'tools').mockReturnValue({
        arm: jest.fn().mockRejectedValue(new Error('内部エラー'))
      });

      const request = {
        params: {
          name: 'arm',
          arguments: {}
        }
      };

      await expect(callToolHandler(request)).rejects.toThrow('ツール実行エラー: 内部エラー');
    });
  });

  describe('エラーハンドリング', () => {
    it('サーバーエラー時にonerrorが呼ばれる', async () => {
      const mockError = new Error('サーバーエラー');
      let errorHandler: Function;

      await server.start();

      // onerrorハンドラーを設定
      if (mockServer.onerror) {
        errorHandler = mockServer.onerror;
      }

      // コンソールエラーをモック
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      if (errorHandler) {
        errorHandler(mockError);
      }

      consoleSpy.mockRestore();
    });
  });

  describe('接続管理', () => {
    it('getConnectionStatus でサーバーの接続状態を取得できる', () => {
      const status = server.getConnectionStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.isConnected).toBe('boolean');
      expect(typeof status.host).toBe('string');
      expect(typeof status.port).toBe('number');
    });

    it('reconnect で再接続を実行できる', async () => {
      await server.start();
      
      await expect(server.reconnect()).resolves.not.toThrow();
    });
  });

  describe('イベントハンドリング', () => {
    it('ArduPilot接続イベントが適切にハンドリングされる', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await server.start();
      
      // 接続イベントをシミュレート
      const connection = (server as any).connection;
      connection.emit('connected');
      connection.emit('disconnected');
      
      consoleSpy.mockRestore();
    });

    it('ハートビートイベントが適切にハンドリングされる', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await server.start();
      
      // ハートビートイベントをシミュレート
      const connection = (server as any).connection;
      connection.emit('heartbeat', {
        baseMode: 128, // ARMED
        customMode: COPTER_MODE.GUIDED,
        systemStatus: 4
      });
      
      consoleSpy.mockRestore();
    });
  });
});