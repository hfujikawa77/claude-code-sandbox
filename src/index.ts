import { ArduPilotMcpServer } from './mcp-server.js';

async function main(): Promise<void> {
  const server = new ArduPilotMcpServer();
  
  // プロセス終了時の処理
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('サーバー開始エラー:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});