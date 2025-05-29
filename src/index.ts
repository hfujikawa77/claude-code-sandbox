import { ArduPilotMcpServer } from './mcp-server.js';
import { ErrorHandler } from './errors.js';

console.log("ArduPilot MCP Server - TypeScript version");

async function main(): Promise<void> {
  const server = new ArduPilotMcpServer();
  
  // プロセス終了時の処理
  process.on('SIGINT', async () => {
    console.log('\nサーバーを停止しています...');
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('サーバー停止エラー:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('\nサーバーを停止しています...');
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('サーバー停止エラー:', error);
      process.exit(1);
    }
  });

  // 未処理のPromise拒否をキャッチ
  process.on('unhandledRejection', (reason, promise) => {
    console.error('未処理のPromise拒否:', reason);
    const handledError = ErrorHandler.handleError(reason);
    console.error('ハンドル済みエラー:', handledError);
  });

  // 未処理の例外をキャッチ
  process.on('uncaughtException', (error) => {
    console.error('未処理の例外:', error);
    const handledError = ErrorHandler.handleError(error);
    console.error('ハンドル済みエラー:', handledError);
    process.exit(1);
  });

  try {
    await server.run();
  } catch (error) {
    console.error('サーバー開始エラー:', error);
    const handledError = ErrorHandler.handleError(error);
    console.error('ハンドル済みエラー:', handledError);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('予期しないエラー:', error);
    process.exit(1);
  });
}