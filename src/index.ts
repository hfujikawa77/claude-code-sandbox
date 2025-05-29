import { ArduPilotMcpServer } from './mcp-server.js';

// ArduPilot MCP Server in TypeScript
console.log("ArduPilot MCP Server - TypeScript version");

async function main(): Promise<void> {
  try {
    const server = new ArduPilotMcpServer();
    await server.run();
  } catch (error) {
    console.error("MCPサーバーエラー:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}