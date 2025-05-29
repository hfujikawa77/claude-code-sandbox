import { ArduPilotConnection } from './connection.js';

async function testConnection() {
  const connection = new ArduPilotConnection({
    host: '127.0.0.1',
    port: 14552,
    sourceSystem: 1,
    sourceComponent: 90,
    timeoutMs: 5000
  });

  connection.on('connected', () => {
    console.log('✅ ArduPilot接続成功');
    console.log('接続状態:', connection.getConnectionStatus());
  });

  connection.on('heartbeat', (data) => {
    console.log('💓 ハートビート受信:', {
      autopilot: data.autopilot,
      type: data.type,
      systemStatus: data.systemStatus,
      baseMode: data.baseMode,
      customMode: data.customMode
    });
  });

  connection.on('error', (error) => {
    console.error('❌ 接続エラー:', error.message);
  });

  connection.on('disconnected', () => {
    console.log('🔌 接続が切断されました');
  });

  try {
    console.log('ArduPilot SITL への接続を試行中...');
    await connection.connect();
    
    // Wait for a few heartbeats
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('テスト完了。接続を切断します...');
    await connection.cleanup();
    
  } catch (error) {
    console.error('接続テストに失敗しました:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection().catch(console.error);
}